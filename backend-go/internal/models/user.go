package models

import (
	"time"
)

// User 用户表
type User struct {
	ID        uint64        `gorm:"primaryKey;autoIncrement" json:"id"`
	Email     string        `gorm:"size:255;not null;uniqueIndex:uk_email" json:"email"`
	Password  string        `gorm:"size:255;not null" json:"-"`
	Name      string        `gorm:"size:255;not null" json:"name"`
	Role      string        `gorm:"size:50;not null;default:user" json:"role"`
	CreatedAt time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"createdAt"`
	UpdatedAt time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updatedAt"`
	Progress  *UserProgress `gorm:"foreignKey:UserID" json:"-"`
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}
