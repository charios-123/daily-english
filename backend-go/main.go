package main

import (
	"log"
	"net/http"

	"daily-english-reader-backend/config"
	"daily-english-reader-backend/database"
	"daily-english-reader-backend/handlers"
	"daily-english-reader-backend/middleware"
	"daily-english-reader-backend/models"
	"daily-english-reader-backend/services"

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

	// 创建 Gin 引擎
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), corsMiddleware())

	// 初始化服务
	cosService := services.NewCosService(cfg)
	ttsService := services.NewTtsService()
	progressService := services.NewProgressService()
	ragService := services.NewRAGService()
	aiService := services.NewAiService(cfg, ragService)

	// 后台预热 RAG 知识库（不阻塞启动）
	go func() {
		if database.IsAvailable() {
			ragService.Retrieve("预热", 1)
		}
	}()

	// 初始化处理器
	authHandler := handlers.NewAuthHandler(cfg)
	articleHandler := handlers.NewArticleHandler(cosService)
	progressHandler := handlers.NewProgressHandler(progressService)
	aiHandler := handlers.NewAiHandler(aiService, ragService)
	ttsHandler := handlers.NewTtsHandler(ttsService, cosService)
	cosHandler := handlers.NewCosHandler(cosService)
	healthHandler := handlers.NewHealthHandler()
	adminHandler := handlers.NewAdminHandler()

	// 路由注册
	api := r.Group("/api")

	// 公开接口
	healthHandler.Register(api.Group("/health"))
	articleHandler.Register(api.Group("/articles"))

	// 需要数据库的接口
	dbGroup := api.Group("", middleware.DBRequiredMiddleware())
	authHandler.Register(dbGroup.Group("/auth"))
	progressHandler.Register(dbGroup.Group("/progress"), cfg)
	aiHandler.Register(dbGroup.Group("/ai"))
	ttsHandler.Register(dbGroup.Group("/tts"))
	cosHandler.Register(dbGroup.Group("/cos"))
	adminHandler.Register(dbGroup, cfg)

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

// corsMiddleware 跨域支持
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
