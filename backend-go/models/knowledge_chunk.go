package models

import (
	"time"

	"gorm.io/datatypes"
)

// KnowledgeChunk RAG 知识库切片（文章按段落切块，含词频向量）
type KnowledgeChunk struct {
	ID        uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	ArticleID uint64         `gorm:"index:idx_article" json:"articleId"`
	ChunkType string         `gorm:"size:20;default:paragraph" json:"chunkType"`
	Content   string         `gorm:"type:text" json:"content"`
	Vector    datatypes.JSON `gorm:"type:json" json:"-"`
	CreatedAt time.Time      `json:"createdAt"`
}

// TableName 指定表名
func (KnowledgeChunk) TableName() string {
	return "knowledge_chunks"
}
