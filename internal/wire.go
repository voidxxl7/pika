//go:build wireinject
// +build wireinject

package internal

import (
	"github.com/dushixiang/pika/internal/config"
	"github.com/dushixiang/pika/internal/handler"
	"github.com/dushixiang/pika/internal/service"
	"github.com/dushixiang/pika/internal/websocket"
	"github.com/google/wire"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// InitializeApp 初始化应用
func InitializeApp(logger *zap.Logger, db *gorm.DB, cfg *config.AppConfig) (*AppComponents, error) {
	wire.Build(
		service.NewAccountService,
		service.NewAgentService,
		service.NewUserService,
		service.NewApiKeyService,
		service.NewAlertService,
		service.NewPropertyService,
		service.NewMonitorService,

		service.NewNotifier,
		// WebSocket Manager
		websocket.NewManager,

		// Handlers
		handler.NewAgentHandler,
		handler.NewUserHandler,
		handler.NewAlertHandler,
		handler.NewPropertyHandler,
		handler.NewMonitorHandler,
		handler.NewApiKeyHandler,
		handler.NewAccountHandler,

		// App Components
		wire.Struct(new(AppComponents), "*"),
	)
	return nil, nil
}

// AppComponents 应用组件
type AppComponents struct {
	AccountHandler  *handler.AccountHandler
	AgentHandler    *handler.AgentHandler
	UserHandler     *handler.UserHandler
	ApiKeyHandler   *handler.ApiKeyHandler
	AlertHandler    *handler.AlertHandler
	PropertyHandler *handler.PropertyHandler
	MonitorHandler  *handler.MonitorHandler

	AgentService    *service.AgentService
	UserService     *service.UserService
	AlertService    *service.AlertService
	PropertyService *service.PropertyService
	MonitorService  *service.MonitorService
	ApiKeyService   *service.ApiKeyService

	WSManager *websocket.Manager
}
