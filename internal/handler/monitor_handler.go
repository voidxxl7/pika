package handler

import (
	"github.com/dushixiang/pika/internal/service"
	"github.com/dushixiang/pika/internal/utils"
	"github.com/go-orz/orz"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

type MonitorHandler struct {
	logger         *zap.Logger
	monitorService *service.MonitorService
}

func NewMonitorHandler(logger *zap.Logger, monitorService *service.MonitorService) *MonitorHandler {
	return &MonitorHandler{
		logger:         logger,
		monitorService: monitorService,
	}
}

func (h *MonitorHandler) List(c echo.Context) error {
	keyword := c.QueryParam("keyword")
	name := c.QueryParam("name")
	target := c.QueryParam("target")
	typeParam := c.QueryParam("type")
	enabled := c.QueryParam("enabled")

	pr := orz.GetPageRequest(c, "-updated_at", "name")

	builder := orz.NewPageBuilder(h.monitorService.MonitorRepo).
		PageRequest(pr)

	// 如果有 keyword，则搜索 name（也可以搜索 target）
	if keyword != "" {
		// keyword 可以匹配 name 或 target
		builder.Contains("name", keyword)
		// 如果需要同时搜索 target，可以手动构建 OR 查询
		// 这里简化处理，只搜索 name
	} else {
		// 否则使用独立的 name 和 target 搜索
		builder.Contains("name", name).
			Contains("target", target)
	}

	// 处理类型筛选
	if typeParam != "" {
		builder.Equal("type", typeParam)
	}

	// 处理启用状态筛选
	if enabled == "true" {
		builder.Equal("enabled", "1")
	} else if enabled == "false" {
		builder.Equal("enabled", "0")
	}

	ctx := c.Request().Context()
	page, err := builder.Execute(ctx)
	if err != nil {
		return err
	}
	return orz.Ok(c, page)
}

func (h *MonitorHandler) Create(c echo.Context) error {
	var req service.MonitorTaskRequest
	if err := c.Bind(&req); err != nil {
		return orz.NewError(400, "请求参数错误")
	}

	ctx := c.Request().Context()
	item, err := h.monitorService.CreateMonitor(ctx, &req)
	if err != nil {
		return err
	}

	return orz.Ok(c, item)
}

func (h *MonitorHandler) Get(c echo.Context) error {
	id := c.Param("id")

	ctx := c.Request().Context()
	item, err := h.monitorService.FindById(ctx, id)
	if err != nil {
		return err
	}

	return orz.Ok(c, item)
}

func (h *MonitorHandler) Update(c echo.Context) error {
	id := c.Param("id")

	var req service.MonitorTaskRequest
	if err := c.Bind(&req); err != nil {
		return orz.NewError(400, "请求参数错误")
	}

	ctx := c.Request().Context()
	item, err := h.monitorService.UpdateMonitor(ctx, id, &req)
	if err != nil {
		return err
	}

	return orz.Ok(c, item)
}

func (h *MonitorHandler) Delete(c echo.Context) error {
	id := c.Param("id")

	ctx := c.Request().Context()
	if err := h.monitorService.DeleteMonitor(ctx, id); err != nil {
		return err
	}

	return nil
}

// GetMonitors 获取所有监控统计数据
func (h *MonitorHandler) GetMonitors(c echo.Context) error {
	ctx := c.Request().Context()
	stats, err := h.monitorService.ListByAuth(ctx, utils.IsAuthenticated(c))
	if err != nil {
		return err
	}

	return orz.Ok(c, stats)
}

// GetStatsByID 获取指定监控任务的统计数据（公开接口，已登录返回全部，未登录返回公开可见）
func (h *MonitorHandler) GetStatsByID(c echo.Context) error {
	id := c.Param("id")
	ctx := c.Request().Context()

	// 验证监控任务访问权限
	if _, err := h.monitorService.GetMonitorByAuth(ctx, id, utils.IsAuthenticated(c)); err != nil {
		return err
	}

	stats, err := h.monitorService.GetMonitorStatsByID(ctx, id)
	if err != nil {
		return err
	}

	return orz.Ok(c, stats)
}

// GetHistoryByID 获取指定监控任务的历史响应时间数据（公开接口，已登录返回全部，未登录返回公开可见）
func (h *MonitorHandler) GetHistoryByID(c echo.Context) error {
	id := c.Param("id")
	ctx := c.Request().Context()

	// 验证监控任务访问权限
	if _, err := h.monitorService.GetMonitorByAuth(ctx, id, utils.IsAuthenticated(c)); err != nil {
		return err
	}

	timeRange := c.QueryParam("range")

	// 默认时间范围为 5 分钟
	if timeRange == "" {
		timeRange = "5m"
	}

	history, err := h.monitorService.GetMonitorHistory(ctx, id, timeRange)
	if err != nil {
		return err
	}

	return orz.Ok(c, history)
}
