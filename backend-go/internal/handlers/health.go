package handlers

import (
	"net/http"
	"time"

	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// HealthHandler 健康检查处理器
type HealthHandler struct{}

// NewHealthHandler 创建健康检查处理器
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Register 路由注册
func (h *HealthHandler) Register(r *gin.RouterGroup) {
	r.GET("", h.health)
}

// health 健康检查
func (h *HealthHandler) health(c *gin.Context) {
	c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
		"status":    "UP",
		"timestamp": time.Now().UnixMilli(),
	}))
}
