package models

import (
	"time"

	"gorm.io/datatypes"
)

// UserProgress 用户学习进度表
type UserProgress struct {
	ID                     uint64          `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID                 uint64          `gorm:"column:user_id;not null;uniqueIndex:uk_user_id" json:"userId"`
	CompletedArticleIDs    datatypes.JSON  `gorm:"column:completed_article_ids;type:json" json:"-"`
	TotalDaysLearned       int             `gorm:"column:total_days_learned;not null;default:0" json:"-"`
	TotalArticlesCompleted int             `gorm:"column:total_articles_completed;not null;default:0" json:"-"`
	CurrentStreak          int             `gorm:"column:current_streak;not null;default:0" json:"-"`
	LongestStreak          int             `gorm:"column:longest_streak;not null;default:0" json:"-"`
	BeginnerCount          int             `gorm:"column:beginner_count;not null;default:0" json:"-"`
	IntermediateCount      int             `gorm:"column:intermediate_count;not null;default:0" json:"-"`
	AdvancedCount          int             `gorm:"column:advanced_count;not null;default:0" json:"-"`
	LastCompletedDate      *datatypes.Date `gorm:"column:last_completed_date;type:date" json:"-"`
	ActivityLog            datatypes.JSON  `gorm:"column:activity_log;type:json" json:"-"`
	Badges                 datatypes.JSON  `gorm:"type:json" json:"-"`
}

// TableName 指定表名
func (UserProgress) TableName() string {
	return "user_progress"
}

// LastCompletedDateValue 返回 lastCompletedDate 的 time.Time 值（可能为 nil）
func (p *UserProgress) LastCompletedDateValue() *time.Time {
	if p.LastCompletedDate == nil {
		return nil
	}
	t := time.Time(*p.LastCompletedDate)
	return &t
}
