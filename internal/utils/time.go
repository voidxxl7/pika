package utils

import (
	"fmt"
	"time"
)

// FormatTimestamp 格式化时间戳（毫秒）为字符串
func FormatTimestamp(timestampMs int64) string {
	if timestampMs <= 0 {
		return ""
	}
	return time.UnixMilli(timestampMs).Format(time.DateTime)
}

// FormatDuration 格式化持续时间（毫秒）为可读字符串
func FormatDuration(durationMs int64) string {
	if durationMs <= 0 {
		return ""
	}

	durationSec := durationMs / 1000
	if durationSec < 60 {
		return fmt.Sprintf("%d秒", durationSec)
	}

	if durationSec < 3600 {
		minutes := durationSec / 60
		seconds := durationSec % 60
		return fmt.Sprintf("%d分%d秒", minutes, seconds)
	}

	hours := durationSec / 3600
	minutes := (durationSec % 3600) / 60
	seconds := durationSec % 60
	return fmt.Sprintf("%d时%d分%d秒", hours, minutes, seconds)
}
