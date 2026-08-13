package handlers

import (
	"net/http"

	"daily-english-reader-backend/internal/config"
	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/middleware"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/services"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ProgressHandler 学习进度处理器
type ProgressHandler struct {
	progressService *services.ProgressService
}

// NewProgressHandler 创建进度处理器
func NewProgressHandler(progressService *services.ProgressService) *ProgressHandler {
	return &ProgressHandler{progressService: progressService}
}

// Register 路由注册（需要登录）
func (h *ProgressHandler) Register(r *gin.RouterGroup, cfg *config.Config) {
	r.GET("", middleware.AuthMiddleware(cfg), h.getProgress)
	r.POST("/complete", middleware.AuthMiddleware(cfg), h.markComplete)
}

// getProgress 获取用户学习进度
func (h *ProgressHandler) getProgress(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, utils.Error(401, "未登录"))
		return
	}

	progress, err := h.progressService.GetUserProgress(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "获取进度失败"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(progress))
}

// markComplete 标记文章完成
func (h *ProgressHandler) markComplete(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, utils.Error(401, "未登录"))
		return
	}

	var req struct {
		ArticleID uint64 `json:"articleId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ArticleID == 0 {
		c.JSON(http.StatusBadRequest, utils.Error(400, "文章 ID 不能为空"))
		return
	}

	// 获取文章难度
	var article models.Article
	if err := database.DB.First(&article, req.ArticleID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.Error(404, "文章不存在"))
		return
	}

	progress, err := h.progressService.MarkArticleCompleted(user.ID, req.ArticleID, article.Difficulty)
	if err != nil {
		if services.IsArticleAlreadyCompleted(err) {
			c.JSON(http.StatusBadRequest, utils.Error(400, "该文章已完成"))
			return
		}
		c.JSON(http.StatusInternalServerError, utils.Error(500, "更新进度失败"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(progress))
}
