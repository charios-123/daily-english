package models

import (
	"time"

	"gorm.io/datatypes"
)

// Article 文章表
type Article struct {
	ID              uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	Date            datatypes.Date `gorm:"not null;uniqueIndex:uk_date" json:"date"`
	TitleEn         string         `gorm:"column:title_en;size:255;not null" json:"titleEn"`
	TitleZh         string         `gorm:"column:title_zh;size:255;not null" json:"titleZh"`
	SummaryEn       string         `gorm:"column:summary_en;type:text" json:"summaryEn"`
	SummaryZh       string         `gorm:"column:summary_zh;type:text" json:"summaryZh"`
	Content         datatypes.JSON `gorm:"type:json" json:"content"`
	Difficulty      string         `gorm:"size:50;not null;default:intermediate;index:idx_difficulty" json:"difficulty"`
	DurationSeconds *int           `gorm:"column:duration_seconds" json:"durationSeconds"`
	AudioURL        string         `gorm:"column:audio_url;size:500" json:"audioUrl"`
	WordBoundaries  datatypes.JSON `gorm:"column:word_boundaries;type:json" json:"wordBoundaries"`
	CreatedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
}

// TableName 指定表名
func (Article) TableName() string {
	return "articles"
}
