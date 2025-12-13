package service

import (
	"github.com/yuqie6/mirror/internal/ai"
	"github.com/yuqie6/mirror/internal/repository"
)

const DefaultTopAppsLimit = 8

func SecondsToMinutesFloor(seconds int) int {
	if seconds <= 0 {
		return 0
	}
	return seconds / 60
}

func TopAppStats(stats []repository.AppStat, limit int) []repository.AppStat {
	if limit <= 0 || limit >= len(stats) {
		return stats
	}
	return stats[:limit]
}

func WindowEventInfosFromAppStats(stats []repository.AppStat, limit int) []ai.WindowEventInfo {
	picked := TopAppStats(stats, limit)
	out := make([]ai.WindowEventInfo, 0, len(picked))
	for _, stat := range picked {
		out = append(out, ai.WindowEventInfo{
			AppName:  stat.AppName,
			Duration: SecondsToMinutesFloor(stat.TotalDuration),
		})
	}
	return out
}

func SumCodingMinutesFromAppStats(stats []repository.AppStat) int64 {
	var total int64
	for _, stat := range stats {
		if IsCodeEditor(stat.AppName) {
			total += int64(SecondsToMinutesFloor(stat.TotalDuration))
		}
	}
	return total
}

