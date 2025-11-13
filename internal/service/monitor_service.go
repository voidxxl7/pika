package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/dushixiang/pika/internal/models"
	"github.com/dushixiang/pika/internal/protocol"
	"github.com/dushixiang/pika/internal/repo"
	ws "github.com/dushixiang/pika/internal/websocket"
	"github.com/go-orz/orz"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type MonitorService struct {
	logger *zap.Logger
	*repo.MonitorRepo
	*orz.Service
	agentRepo        *repo.AgentRepo
	metricRepo       *repo.MetricRepo
	monitorStatsRepo *repo.MonitorStatsRepo
	wsManager        *ws.Manager
}

func NewMonitorService(logger *zap.Logger, db *gorm.DB, wsManager *ws.Manager) *MonitorService {
	return &MonitorService{
		logger:           logger,
		MonitorRepo:      repo.NewMonitorRepo(db),
		agentRepo:        repo.NewAgentRepo(db),
		metricRepo:       repo.NewMetricRepo(db),
		monitorStatsRepo: repo.NewMonitorStatsRepo(db),
		wsManager:        wsManager,
	}
}

type MonitorTaskRequest struct {
	Name        string                     `json:"name"`
	Type        string                     `json:"type"`
	Target      string                     `json:"target"`
	Description string                     `json:"description"`
	Enabled     bool                       `json:"enabled,omitempty"`
	Interval    int                        `json:"interval"` // 检测频率（秒）
	HTTPConfig  protocol.HTTPMonitorConfig `json:"httpConfig,omitempty"`
	TCPConfig   protocol.TCPMonitorConfig  `json:"tcpConfig,omitempty"`
	AgentIds    []string                   `json:"agentIds,omitempty"`
}

func (s *MonitorService) CreateMonitor(ctx context.Context, req *MonitorTaskRequest) (*models.MonitorTask, error) {
	// 设置默认检测频率
	interval := req.Interval
	if interval <= 0 {
		interval = 60 // 默认 60 秒
	}

	task := &models.MonitorTask{
		ID:          uuid.NewString(),
		Name:        strings.TrimSpace(req.Name),
		Type:        req.Type,
		Target:      strings.TrimSpace(req.Target),
		Description: req.Description,
		Enabled:     req.Enabled,
		Interval:    interval,
		AgentIds:    datatypes.JSONSlice[string](req.AgentIds),
		HTTPConfig:  datatypes.NewJSONType(req.HTTPConfig),
		TCPConfig:   datatypes.NewJSONType(req.TCPConfig),
		CreatedAt:   0,
		UpdatedAt:   0,
	}

	if err := s.MonitorRepo.Create(ctx, task); err != nil {
		return nil, err
	}

	return task, nil
}

func (s *MonitorService) UpdateMonitor(ctx context.Context, id string, req *MonitorTaskRequest) (*models.MonitorTask, error) {
	task, err := s.MonitorRepo.FindById(ctx, id)
	if err != nil {
		return nil, err
	}

	task.Name = strings.TrimSpace(req.Name)
	task.Type = req.Type
	task.Target = strings.TrimSpace(req.Target)
	task.Description = req.Description

	// 更新检测频率
	interval := req.Interval
	if interval <= 0 {
		interval = 60 // 默认 60 秒
	}
	task.Interval = interval

	task.AgentIds = req.AgentIds
	task.HTTPConfig = datatypes.NewJSONType(req.HTTPConfig)
	task.TCPConfig = datatypes.NewJSONType(req.TCPConfig)

	if err := s.MonitorRepo.UpdateById(ctx, &task); err != nil {
		return nil, err
	}

	return &task, nil
}

func (s *MonitorService) DeleteMonitor(ctx context.Context, id string) error {
	return s.Transaction(ctx, func(ctx context.Context) error {
		if err := s.MonitorRepo.DeleteById(ctx, id); err != nil {
			return err
		}
		return nil
	})
}

// BroadcastMonitorConfig 向所有在线探针广播监控配置
func (s *MonitorService) BroadcastMonitorConfig(ctx context.Context) error {
	// 获取所有启用的监控任务
	var monitors []models.MonitorTask
	if err := s.MonitorRepo.GetDB(ctx).
		Where("enabled = ?", true).
		Find(&monitors).Error; err != nil {
		return err
	}

	// 如果没有启用的监控任务，直接返回（不需要发送任何配置）
	if len(monitors) == 0 {
		s.logger.Debug("没有启用的监控任务，跳过配置推送")
		return nil
	}

	// 获取所有在线探针
	agents, err := s.agentRepo.FindOnlineAgents(ctx)
	if err != nil {
		s.logger.Error("获取在线探针失败", zap.Error(err))
		return err
	}

	// 按探针分组构建监控配置
	agentMonitors := make(map[string][]models.MonitorTask)

	for _, monitor := range monitors {
		// 如果没有指定探针，则发送给所有探针
		if len(monitor.AgentIds) == 0 {
			for _, agent := range agents {
				agentMonitors[agent.ID] = append(agentMonitors[agent.ID], monitor)
			}
		} else {
			// 只发送给指定的探针（只发送给在线的探针）
			for _, agentID := range monitor.AgentIds {
				// 检查该探针是否在线
				isOnline := false
				for _, agent := range agents {
					if agent.ID == agentID {
						isOnline = true
						break
					}
				}
				if isOnline {
					agentMonitors[agentID] = append(agentMonitors[agentID], monitor)
				}
			}
		}
	}

	// 向每个有监控任务的探针发送对应的监控配置
	for agentID, tasks := range agentMonitors {
		items := make([]protocol.MonitorItem, 0, len(tasks))
		for _, task := range tasks {
			item := protocol.MonitorItem{
				Name:   task.Name,
				Type:   task.Type,
				Target: task.Target,
			}

			if task.Type == "http" || task.Type == "https" {
				var httpConfig protocol.HTTPMonitorConfig
				if err := task.HTTPConfig.Scan(&httpConfig); err == nil {
					item.HTTPConfig = &httpConfig
				}
			} else if task.Type == "tcp" {
				var tcpConfig protocol.TCPMonitorConfig
				if err := task.TCPConfig.Scan(&tcpConfig); err == nil {
					item.TCPConfig = &tcpConfig
				}
			}

			items = append(items, item)
		}

		// 构建监控配置 payload
		// Interval 字段不再使用（探针收到后立即检测一次），但保留字段兼容性
		payload := protocol.MonitorConfigPayload{
			Interval: 0,
			Items:    items,
		}

		// 发送监控配置到指定探针
		if err := s.sendMonitorConfigToAgent(agentID, payload); err != nil {
			s.logger.Error("发送监控配置失败",
				zap.String("agentID", agentID),
				zap.Error(err))
		} else {
			s.logger.Debug("发送监控配置成功",
				zap.String("agentID", agentID),
				zap.Int("taskCount", len(items)))
		}
	}

	return nil
}

// sendMonitorConfigToAgent 向指定探针发送监控配置（内部方法）
func (s *MonitorService) sendMonitorConfigToAgent(agentID string, payload protocol.MonitorConfigPayload) error {
	payloadData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	msg := protocol.Message{
		Type: protocol.MessageTypeMonitorConfig,
		Data: payloadData,
	}

	msgData, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return s.wsManager.SendToClient(agentID, msgData)
}

// SendMonitorTaskToAgents 向指定探针发送单个监控任务（公开方法）
func (s *MonitorService) SendMonitorTaskToAgents(ctx context.Context, monitor models.MonitorTask, agentIDs []string) error {
	// 获取所有在线探针
	agents, err := s.agentRepo.FindOnlineAgents(ctx)
	if err != nil {
		return err
	}

	// 确定要发送的探针列表
	var targetAgents []models.Agent
	if len(agentIDs) == 0 {
		// 发送给所有在线探针
		targetAgents = agents
	} else {
		// 只发送给指定的在线探针
		for _, agent := range agents {
			for _, agentID := range agentIDs {
				if agent.ID == agentID {
					targetAgents = append(targetAgents, agent)
					break
				}
			}
		}
	}

	if len(targetAgents) == 0 {
		return nil
	}

	// 构建监控项
	item := protocol.MonitorItem{
		Name:   monitor.Name,
		Type:   monitor.Type,
		Target: monitor.Target,
	}

	if monitor.Type == "http" || monitor.Type == "https" {
		var httpConfig protocol.HTTPMonitorConfig
		if err := monitor.HTTPConfig.Scan(&httpConfig); err == nil {
			item.HTTPConfig = &httpConfig
		}
	} else if monitor.Type == "tcp" {
		var tcpConfig protocol.TCPMonitorConfig
		if err := monitor.TCPConfig.Scan(&tcpConfig); err == nil {
			item.TCPConfig = &tcpConfig
		}
	}

	// 构建 payload
	payload := protocol.MonitorConfigPayload{
		Interval: 0,
		Items:    []protocol.MonitorItem{item},
	}

	// 向每个目标探针发送
	for _, agent := range targetAgents {
		if err := s.sendMonitorConfigToAgent(agent.ID, payload); err != nil {
			s.logger.Error("发送监控配置失败",
				zap.String("taskID", monitor.ID),
				zap.String("taskName", monitor.Name),
				zap.String("agentID", agent.ID),
				zap.Error(err))
		}
	}

	return nil
}

// CalculateMonitorStats 计算监控统计数据
func (s *MonitorService) CalculateMonitorStats(ctx context.Context) error {
	now := time.Now()

	// 获取所有启用的监控任务
	var monitors []models.MonitorTask
	if err := s.MonitorRepo.GetDB(ctx).
		Where("enabled = ?", true).
		Find(&monitors).Error; err != nil {
		return err
	}

	// 获取所有在线探针
	agents, err := s.agentRepo.FindOnlineAgents(ctx)
	if err != nil {
		return err
	}

	// 为每个监控任务的每个探针计算统计数据
	for _, monitor := range monitors {
		var targetAgents []models.Agent
		if len(monitor.AgentIds) == 0 {
			targetAgents = agents
		} else {
			for _, agent := range agents {
				for _, agentID := range monitor.AgentIds {
					if agent.ID == agentID {
						targetAgents = append(targetAgents, agent)
						break
					}
				}
			}
		}

		for _, agent := range targetAgents {
			stats, err := s.calculateStatsForAgentMonitor(ctx, agent.ID, monitor.Name, monitor.Type, monitor.Target, now)
			if err != nil {
				s.logger.Error("计算监控统计失败",
					zap.String("agentID", agent.ID),
					zap.String("monitorName", monitor.Name),
					zap.Error(err))
				continue
			}

			if err := s.monitorStatsRepo.UpsertStats(ctx, stats); err != nil {
				s.logger.Error("保存监控统计失败",
					zap.String("agentID", agent.ID),
					zap.String("monitorName", monitor.Name),
					zap.Error(err))
			}
		}
	}

	return nil
}

// calculateStatsForAgentMonitor 计算单个探针单个监控任务的统计数据
func (s *MonitorService) calculateStatsForAgentMonitor(ctx context.Context, agentID, monitorName, monitorType, target string, now time.Time) (*models.MonitorStats, error) {
	stats := &models.MonitorStats{
		AgentID:     agentID,
		MonitorName: monitorName,
		MonitorType: monitorType,
		Target:      target,
	}

	// 计算24小时数据
	start24h := now.Add(-24 * time.Hour).UnixMilli()
	end := now.UnixMilli()
	metrics24h, err := s.metricRepo.GetMonitorMetrics(ctx, agentID, monitorName, start24h, end)
	if err != nil {
		return nil, err
	}

	// 计算30天数据
	start30d := now.Add(-30 * 24 * time.Hour).UnixMilli()
	metrics30d, err := s.metricRepo.GetMonitorMetrics(ctx, agentID, monitorName, start30d, end)
	if err != nil {
		return nil, err
	}

	// 计算24小时统计
	if len(metrics24h) > 0 {
		var totalResponse int64
		var successCount int64
		lastMetric := metrics24h[len(metrics24h)-1]

		for _, metric := range metrics24h {
			if metric.Status == "up" {
				successCount++
				totalResponse += metric.ResponseTime
			}
		}

		stats.TotalChecks24h = int64(len(metrics24h))
		stats.SuccessChecks24h = successCount
		if successCount > 0 {
			stats.AvgResponse24h = totalResponse / successCount
		}
		if stats.TotalChecks24h > 0 {
			stats.Uptime24h = float64(successCount) / float64(stats.TotalChecks24h) * 100
		}

		// 最后一次检测数据
		stats.CurrentResponse = lastMetric.ResponseTime
		stats.LastCheckTime = lastMetric.Timestamp
		stats.LastCheckStatus = lastMetric.Status

		// 从最新的检测结果中获取证书信息
		if lastMetric.CertExpiryTime > 0 {
			stats.CertExpiryDate = lastMetric.CertExpiryTime
			stats.CertExpiryDays = lastMetric.CertDaysLeft
		}
	}

	// 计算30天统计
	if len(metrics30d) > 0 {
		var successCount int64
		for _, metric := range metrics30d {
			if metric.Status == "up" {
				successCount++
			}
		}

		stats.TotalChecks30d = int64(len(metrics30d))
		stats.SuccessChecks30d = successCount
		if stats.TotalChecks30d > 0 {
			stats.Uptime30d = float64(successCount) / float64(stats.TotalChecks30d) * 100
		}
	}

	return stats, nil
}

// GetMonitorStatsByName 获取监控任务的统计数据（所有探针）
func (s *MonitorService) GetMonitorStatsByName(ctx context.Context, monitorName string) ([]models.MonitorStats, error) {
	return s.monitorStatsRepo.ListByMonitorName(ctx, monitorName)
}

// GetAllMonitorStats 获取所有监控统计数据
func (s *MonitorService) GetAllMonitorStats(ctx context.Context) ([]models.MonitorStats, error) {
	return s.monitorStatsRepo.ListAll(ctx)
}

// GetMonitorHistory 获取监控任务的历史响应时间数据
func (s *MonitorService) GetMonitorHistory(ctx context.Context, monitorName, timeRange string) ([]repo.AggregatedMonitorMetric, error) {
	// 解析时间范围
	var duration time.Duration
	var interval int // 聚合间隔（秒）

	switch timeRange {
	case "5m":
		duration = 5 * time.Minute
		interval = 15 // 15秒聚合一次
	case "15m":
		duration = 15 * time.Minute
		interval = 30 // 30秒聚合一次
	case "30m":
		duration = 30 * time.Minute
		interval = 60 // 1分钟聚合一次
	case "1h":
		duration = 1 * time.Hour
		interval = 120 // 2分钟聚合一次
	default:
		duration = 5 * time.Minute
		interval = 15
	}

	now := time.Now()
	end := now.UnixMilli()
	start := now.Add(-duration).UnixMilli()

	return s.metricRepo.GetAggregatedMonitorMetrics(ctx, monitorName, start, end, interval)
}
