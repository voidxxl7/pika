package repo

import (
	"context"

	"github.com/dushixiang/pika/internal/models"
	"github.com/go-orz/orz"
	"gorm.io/gorm"
)

type MonitorRepo struct {
	orz.Repository[models.MonitorTask, string]
}

func NewMonitorRepo(db *gorm.DB) *MonitorRepo {
	return &MonitorRepo{
		Repository: orz.NewRepository[models.MonitorTask, string](db),
	}
}

func (r *MonitorRepo) FindByEnabledAndAgentId(ctx context.Context, agentId string) ([]models.MonitorTask, error) {
	var tasks []models.MonitorTask
	if err := r.GetDB(ctx).
		Model(&models.MonitorTask{}).
		Where(`enabled = ? and (agent_id = ? or agent_id = "")`, true, agentId).
		Find(&tasks).Error; err != nil {
		return nil, err
	}

	return tasks, nil
}

func (r *MonitorRepo) FindByAuth(ctx context.Context, isAuthenticated bool) ([]models.MonitorTask, error) {
	var monitors []models.MonitorTask
	if err := r.GetDB(ctx).
		Where("enabled = ?", true).
		Order("name ASC").
		Find(&monitors).Error; err != nil {
		return nil, err
	}
	var filteredMonitors []models.MonitorTask
	for _, monitor := range monitors {
		if isAuthenticated || monitor.Visibility == "public" {
			filteredMonitors = append(filteredMonitors, monitor)
		}
	}
	return filteredMonitors, nil
}

// FindPublicMonitorByID 查找指定ID的公开可见监控任务
func (r *MonitorRepo) FindPublicMonitorByID(ctx context.Context, id string) (*models.MonitorTask, error) {
	var task models.MonitorTask
	err := r.GetDB(ctx).
		Where("id = ? AND visibility = ?", id, "public").
		First(&task).Error
	if err != nil {
		return nil, err
	}
	return &task, nil
}
