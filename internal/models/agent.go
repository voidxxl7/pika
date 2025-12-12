package models

import "gorm.io/datatypes"

// Agent 探针信息
type Agent struct {
	ID         string                      `gorm:"primaryKey" json:"id"`                  // 探针ID (UUID)
	Name       string                      `gorm:"index" json:"name"`                     // 探针名称
	Hostname   string                      `gorm:"index" json:"hostname,omitempty"`       // 主机名
	IP         string                      `gorm:"index" json:"ip,omitempty"`             // IP地址
	OS         string                      `json:"os"`                                    // 操作系统
	Arch       string                      `json:"arch"`                                  // 架构
	Version    string                      `json:"version"`                               // 探针版本
	Tags       datatypes.JSONSlice[string] `json:"tags"`                                  // 标签
	ExpireTime int64                       `json:"expireTime"`                            // 到期时间（时间戳毫秒）
	Status     int                         `json:"status"`                                // 状态: 0-离线, 1-在线
	Visibility string                      `gorm:"default:public" json:"visibility"`      // 可见性: public-匿名可见, private-登录可见
	LastSeenAt int64                       `gorm:"index" json:"lastSeenAt"`               // 最后上线时间（时间戳毫秒）
	CreatedAt  int64                       `json:"createdAt"`                             // 创建时间（时间戳毫秒）
	UpdatedAt  int64                       `json:"updatedAt" gorm:"autoUpdateTime:milli"` // 更新时间（时间戳毫秒）

	// 流量统计相关字段
	TrafficLimit        uint64 `json:"trafficLimit"`        // 流量限额(字节), 0表示不限制
	TrafficUsed         uint64 `json:"trafficUsed"`         // 当前周期已使用流量(字节)
	TrafficResetDay     int    `json:"trafficResetDay"`     // 流量重置日期(1-31), 0表示不自动重置
	TrafficPeriodStart  int64  `json:"trafficPeriodStart"`  // 当前周期开始时间(时间戳毫秒)
	TrafficBaselineRecv uint64 `json:"trafficBaselineRecv"` // 当前周期流量基线(BytesRecvTotal)
	TrafficAlertSent80  bool   `json:"trafficAlertSent80"`  // 是否已发送80%告警
	TrafficAlertSent90  bool   `json:"trafficAlertSent90"`  // 是否已发送90%告警
	TrafficAlertSent100 bool   `json:"trafficAlertSent100"` // 是否已发送100%告警
}

func (Agent) TableName() string {
	return "agents"
}
