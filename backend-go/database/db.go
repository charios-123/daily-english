package database

import (
	"fmt"
	"log"

	"daily-english-reader-backend/config"
	"daily-english-reader-backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Init 初始化数据库连接并自动迁移表结构
// 若数据库不可用，不阻塞服务启动（文章接口会降级到本地数据）
func Init(cfg *config.Config) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Asia%%2FShanghai",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		DB = nil
		log.Printf("警告: 数据库连接失败: %v (文章接口将使用降级数据)", err)
		return err
	}

	sqlDB, err := db.DB()
	if err != nil {
		DB = nil
		log.Printf("警告: 获取底层连接失败: %v", err)
		return err
	}
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(10)

	// 自动迁移（表已存在则跳过）
	if err := db.AutoMigrate(&models.User{}, &models.Article{}, &models.UserProgress{}); err != nil {
		log.Printf("警告: 自动迁移失败: %v", err)
	}

	DB = db
	log.Println("数据库连接成功")
	return nil
}

// IsAvailable 判断数据库是否可用
func IsAvailable() bool {
	return DB != nil
}
