package middleware

import (
	"net/http"
	"strings"

	"daily-english-reader-backend/config"
	"daily-english-reader-backend/database"
	"daily-english-reader-backend/models"
	"daily-english-reader-backend/utils"

	"github.com/gin-gonic/gin"
)

const (
	// CtxUserKey context 中存放当前用户信息的 key
	CtxUserKey = "currentUser"
)

// AuthMiddleware JWT 认证中间件：所有受保护接口必须携带有效 Token
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, utils.Error(401, "请先登录"))
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		email, err := utils.ParseToken(tokenStr, cfg.JWTSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, utils.Error(401, "登录已过期，请重新登录"))
			return
		}

		// 根据邮箱加载用户
		var user models.User
		if err := database.DB.Where("email = ?", email).First(&user).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, utils.Error(401, "用户不存在"))
			return
		}

		c.Set(CtxUserKey, &user)
		c.Next()
	}
}

// AdminMiddleware 管理员权限中间件：必须在 AuthMiddleware 之后使用
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get(CtxUserKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, utils.Error(401, "请先登录"))
			return
		}
		user, ok := val.(*models.User)
		if !ok || user.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, utils.Error(403, "无权限访问"))
			return
		}
		c.Next()
	}
}

// GetCurrentUser 从 context 获取当前登录用户（在认证中间件之后使用）
func GetCurrentUser(c *gin.Context) *models.User {
	val, exists := c.Get(CtxUserKey)
	if !exists {
		return nil
	}
	user, ok := val.(*models.User)
	if !ok {
		return nil
	}
	return user
}

// DBRequiredMiddleware 数据库不可用时，依赖数据库的接口返回 503
func DBRequiredMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !database.IsAvailable() {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, utils.Error(503, "服务暂时不可用，请稍后再试"))
			return
		}
		c.Next()
	}
}
