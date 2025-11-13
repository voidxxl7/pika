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
