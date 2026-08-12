package services

import (
	"encoding/json"
	"time"

	"daily-english-reader-backend/database"
	"daily-english-reader-backend/dto"
	"daily-english-reader-backend/models"

	"gorm.io/datatypes"
)

// ProgressService 学习进度服务
type ProgressService struct{}

// NewProgressService 创建进度服务
func NewProgressService() *ProgressService {
	return &ProgressService{}
}

// GetUserProgress 获取用户学习进度，不存在则创建默认进度
func (s *ProgressService) GetUserProgress(userID uint64) (*dto.ProgressDTO, error) {
	progress, err := s.findOrCreate(userID)
	if err != nil {
		return nil, err
	}
	return s.toDTO(progress), nil
}

// MarkArticleCompleted 标记文章完成，更新连续天数、徽章等
func (s *ProgressService) MarkArticleCompleted(userID, articleID uint64, difficulty string) (*dto.ProgressDTO, error) {
	progress, err := s.findOrCreate(userID)
	if err != nil {
		return nil, err
	}

	// 解析已完成文章列表
	completedIDs := parseUint64List(progress.CompletedArticleIDs)
	for _, id := range completedIDs {
		if id == articleID {
			// 文章已完成
			return nil, errArticleAlreadyCompleted
		}
	}

	// 添加到已完成列表
	completedIDs = append(completedIDs, articleID)
	progress.CompletedArticleIDs = mustJSON(completedIDs)
	progress.TotalArticlesCompleted++

	// 更新按难度统计
	switch difficulty {
	case "beginner":
		progress.BeginnerCount++
	case "intermediate":
		progress.IntermediateCount++
	case "advanced":
		progress.AdvancedCount++
	}

	// 更新连续天数
	today := time.Now()
	lastCompleted := progress.LastCompletedDateValue()
	if lastCompleted == nil {
		progress.CurrentStreak = 1
		progress.TotalDaysLearned = 1
	} else if sameDay(*lastCompleted, today) {
		// 今天已完成过，不更新
	} else if isYesterday(*lastCompleted, today) {
		progress.CurrentStreak++
		progress.TotalDaysLearned++
	} else {
		progress.CurrentStreak = 1
		progress.TotalDaysLearned++
	}

	// 更新最长连续天数
	if progress.CurrentStreak > progress.LongestStreak {
		progress.LongestStreak = progress.CurrentStreak
	}

	// 更新最后完成日期
	dt := datatypes.Date(today)
	progress.LastCompletedDate = &dt

	// 更新活动日志
	activityLog := parseStringIntMap(progress.ActivityLog)
	todayStr := today.Format("2006-01-02")
	activityLog[todayStr]++
	progress.ActivityLog = mustJSON(activityLog)

	// 检查并更新徽章
	badges := parseStringList(progress.Badges)
	newBadges := s.checkBadges(progress, badges)
	if len(newBadges) > 0 {
		progress.Badges = mustJSON(newBadges)
	}

	if err := database.DB.Save(progress).Error; err != nil {
		return nil, err
	}

	return s.toDTO(progress), nil
}

// findOrCreate 查找进度记录，不存在则创建默认进度
func (s *ProgressService) findOrCreate(userID uint64) (*models.UserProgress, error) {
	var progress models.UserProgress
	err := database.DB.Where("user_id = ?", userID).First(&progress).Error
	if err == nil {
		return &progress, nil
	}

	// 不存在则创建默认进度
	progress = models.UserProgress{
		UserID:                 userID,
		CompletedArticleIDs:    datatypes.JSON([]byte("[]")),
		TotalDaysLearned:       0,
		TotalArticlesCompleted: 0,
		CurrentStreak:          0,
		LongestStreak:          0,
		BeginnerCount:          0,
		IntermediateCount:      0,
		AdvancedCount:          0,
		ActivityLog:            datatypes.JSON([]byte("{}")),
		Badges:                 datatypes.JSON([]byte("[]")),
	}
	if err := database.DB.Create(&progress).Error; err != nil {
		return nil, err
	}
	return &progress, nil
}

// checkBadges 检查并返回新增徽章
func (s *ProgressService) checkBadges(progress *models.UserProgress, current []string) []string {
	badges := append([]string{}, current...)

	if progress.TotalArticlesCompleted >= 1 && !contains(badges, "first_article") {
		badges = append(badges, "first_article")
	}
	if progress.CurrentStreak >= 3 && !contains(badges, "streak_3") {
		badges = append(badges, "streak_3")
	}
	if progress.TotalArticlesCompleted >= 10 && !contains(badges, "articles_10") {
		badges = append(badges, "articles_10")
	}
	if progress.AdvancedCount >= 1 && !contains(badges, "advanced_master") {
		badges = append(badges, "advanced_master")
	}
	return badges
}

// toDTO 转换为前端 DTO
func (s *ProgressService) toDTO(progress *models.UserProgress) *dto.ProgressDTO {
	var lastCompleted *string
	if progress.LastCompletedDate != nil {
		str := time.Time(*progress.LastCompletedDate).Format("2006-01-02")
		lastCompleted = &str
	}
	return &dto.ProgressDTO{
		CompletedArticleIDs:    parseUint64List(progress.CompletedArticleIDs),
		TotalDaysLearned:       progress.TotalDaysLearned,
		TotalArticlesCompleted: progress.TotalArticlesCompleted,
		CurrentStreak:          progress.CurrentStreak,
		LongestStreak:          progress.LongestStreak,
		BeginnerCount:          progress.BeginnerCount,
		IntermediateCount:      progress.IntermediateCount,
		AdvancedCount:          progress.AdvancedCount,
		LastCompletedDate:      lastCompleted,
		ActivityLog:            parseStringIntMap(progress.ActivityLog),
		Badges:                 parseStringList(progress.Badges),
	}
}

// ---- JSON 解析辅助 ----

func parseUint64List(data []byte) []uint64 {
	list := []uint64{}
	if len(data) == 0 {
		return list
	}
	_ = json.Unmarshal(data, &list)
	return list
}

func parseStringList(data []byte) []string {
	list := []string{}
	if len(data) == 0 {
		return list
	}
	_ = json.Unmarshal(data, &list)
	return list
}

func parseStringIntMap(data []byte) map[string]int {
	m := map[string]int{}
	if len(data) == 0 {
		return m
	}
	_ = json.Unmarshal(data, &m)
	return m
}

func mustJSON(v interface{}) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return data
}

func contains(list []string, target string) bool {
	for _, v := range list {
		if v == target {
			return true
		}
	}
	return false
}

func sameDay(a, b time.Time) bool {
	ya, ma, da := a.Date()
	yb, mb, db := b.Date()
	return ya == yb && ma == mb && da == db
}

func isYesterday(a, b time.Time) bool {
	yesterday := b.AddDate(0, 0, -1)
	return sameDay(a, yesterday)
}
