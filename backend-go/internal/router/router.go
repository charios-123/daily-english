package router

import (
	"net/http"

	"daily-english-reader-backend/internal/config"
	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/handlers"
	"daily-english-reader-backend/internal/middleware"
	"daily-english-reader-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// Register 初始化服务、装配处理器并注册全部路由
func Register(r *gin.Engine, cfg *config.Config) {
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
}

// CORS 跨域支持中间件
func CORS() gin.HandlerFunc {
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
