package main

import (
	"log"

	"daily-english-reader-backend/internal/config"
	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/router"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 加载 .env（不存在则忽略，密钥从系统环境变量读取）
	_ = godotenv.Load()

	cfg := config.Load()

	// 初始化数据库（失败不阻塞启动，文章接口自动降级）
	if err := database.Init(cfg); err != nil {
		log.Printf("数据库初始化失败，文章接口将使用降级数据")
	} else {
		seedAdmin(cfg)
	}

	// 创建 Gin 引擎并注册路由
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), router.CORS())
	router.Register(r, cfg)

	log.Printf("后端服务启动成功，监听端口 %s", cfg.ServerPort)
	if err := r.Run(":" + cfg.ServerPort); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

// seedAdmin 初始化默认管理员账号
func seedAdmin(cfg *config.Config) {
	if !database.IsAvailable() {
		return
	}
	var count int64
	database.DB.Model(&models.User{}).Where("email = ?", cfg.AdminEmail).Count(&count)
	if count > 0 {
		return
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("生成管理员密码失败: %v", err)
		return
	}
	admin := models.User{
		Email:    cfg.AdminEmail,
		Password: string(hashed),
		Name:     cfg.AdminName,
		Role:     "admin",
	}
	if err := database.DB.Create(&admin).Error; err != nil {
		log.Printf("创建管理员失败: %v", err)
		return
	}
	log.Printf("默认管理员账号创建成功: %s", cfg.AdminEmail)
}
