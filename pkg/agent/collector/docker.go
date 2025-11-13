package collector

import (
	"context"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/dushixiang/pika/internal/protocol"
)

// DockerCollector Docker 容器监控采集器
type DockerCollector struct {
	client *client.Client
}

// NewDockerCollector 创建 Docker 采集器
func NewDockerCollector() *DockerCollector {
	// 尝试创建 Docker 客户端
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		// Docker 不可用，返回 nil 客户端
		return &DockerCollector{client: nil}
	}
	return &DockerCollector{client: cli}
}

// Collect 采集 Docker 容器数据
func (d *DockerCollector) Collect() ([]*protocol.DockerContainerData, error) {
	// 检查 Docker 客户端是否可用
	if d.client == nil {
		return []*protocol.DockerContainerData{}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 检查 Docker daemon 是否运行
	_, err := d.client.Ping(ctx)
	if err != nil {
		return []*protocol.DockerContainerData{}, nil
	}

	// 获取所有容器（包括停止的）
	containers, err := d.client.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return []*protocol.DockerContainerData{}, nil
	}

	if len(containers) == 0 {
		return []*protocol.DockerContainerData{}, nil
	}

	var result []*protocol.DockerContainerData

	// 遍历每个容器获取详细信息
	for _, c := range containers {
		data := &protocol.DockerContainerData{
			ContainerID: c.ID[:12], // 使用短ID
			Name:        cleanContainerName(c.Names),
			Image:       c.Image,
			State:       c.State,
			Status:      c.Status,
		}

		// 只为运行中的容器获取统计信息
		if c.State == "running" {
			stats, err := d.getContainerStats(ctx, c.ID)
			if err == nil {
				data.CPUPercent = stats.CPUPercent
				data.MemoryUsage = stats.MemoryUsage
				data.MemoryLimit = stats.MemoryLimit
				data.MemoryPercent = stats.MemoryPercent
				data.NetInput = stats.NetInput
				data.NetOutput = stats.NetOutput
				data.BlockInput = stats.BlockInput
				data.BlockOutput = stats.BlockOutput
				data.Pids = stats.Pids
			}
		}

		result = append(result, data)
	}

	return result, nil
}

// containerStats 容器统计信息
type containerStats struct {
	CPUPercent    float64
	MemoryUsage   uint64
	MemoryLimit   uint64
	MemoryPercent float64
	NetInput      uint64
	NetOutput     uint64
	BlockInput    uint64
	BlockOutput   uint64
	Pids          int
}

// getContainerStats 获取容器统计信息
func (d *DockerCollector) getContainerStats(ctx context.Context, containerID string) (*containerStats, error) {
	// 获取容器统计信息（不使用流式传输）
	statsResponse, err := d.client.ContainerStats(ctx, containerID, false)
	if err != nil {
		return nil, err
	}
	defer statsResponse.Body.Close()

	// 读取响应体
	body, err := io.ReadAll(statsResponse.Body)
	if err != nil {
		return nil, err
	}

	var stats container.StatsResponse
	if err := json.Unmarshal(body, &stats); err != nil {
		return nil, err
	}

	result := &containerStats{
		MemoryUsage: stats.MemoryStats.Usage,
		MemoryLimit: stats.MemoryStats.Limit,
		Pids:        int(stats.PidsStats.Current),
	}

	// 计算 CPU 使用率
	result.CPUPercent = calculateCPUPercent(&stats)

	// 计算内存使用率
	if stats.MemoryStats.Limit > 0 {
		result.MemoryPercent = float64(stats.MemoryStats.Usage) / float64(stats.MemoryStats.Limit) * 100.0
	}

	// 计算网络IO
	for _, network := range stats.Networks {
		result.NetInput += network.RxBytes
		result.NetOutput += network.TxBytes
	}

	// 计算磁盘IO
	for _, bioEntry := range stats.BlkioStats.IoServiceBytesRecursive {
		if bioEntry.Op == "Read" {
			result.BlockInput += bioEntry.Value
		} else if bioEntry.Op == "Write" {
			result.BlockOutput += bioEntry.Value
		}
	}

	return result, nil
}

// calculateCPUPercent 计算 CPU 使用率
func calculateCPUPercent(stats *container.StatsResponse) float64 {
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)

	if systemDelta > 0.0 && cpuDelta > 0.0 {
		cpuPercent := (cpuDelta / systemDelta) * float64(stats.CPUStats.OnlineCPUs) * 100.0
		return cpuPercent
	}
	return 0.0
}

// cleanContainerName 清理容器名称（去除开头的斜杠）
func cleanContainerName(names []string) string {
	if len(names) == 0 {
		return ""
	}
	name := names[0]
	return strings.TrimPrefix(name, "/")
}
