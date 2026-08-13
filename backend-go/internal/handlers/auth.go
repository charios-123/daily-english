package handlers

import (
	"net/http"

	"daily-english-reader-backend/internal/config"
	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/dto"
	"daily-english-reader-backend/internal/middleware"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler 认证相关处理器
type AuthHandler struct {
	cfg *config.Config
}

// NewAuthHandler 创建认证处理器
func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

// Register 路由注册
func (h *AuthHandler) Register(r *gin.RouterGroup) {
	r.POST("/login", h.login)
	r.POST("/register", h.register)
	r.GET("/session", middleware.AuthMiddleware(h.cfg), h.session)
}

// login 用户登录
func (h *AuthHandler) login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "邮箱和密码不能为空"))
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, utils.Error(401, "邮箱或密码错误"))
		return
	}

	// 校验密码（BCrypt）
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, utils.Error(401, "邮箱或密码错误"))
		return
	}

	// 生成 Token
	token, err := utils.GenerateToken(user.Email, h.cfg.JWTExpiration, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "生成Token失败"))
		return
	}

	c.JSON(http.StatusOK, utils.Success(dto.LoginResponse{
		Token: token,
		User:  toUserInfo(&user),
	}))
}

// register 用户注册
func (h *AuthHandler) register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "邮箱、密码和用户名不能为空"))
		return
	}

	// 检查邮箱是否已存在
	var count int64
	database.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, utils.Error(400, "该邮箱已被注册"))
		return
	}

	// 密码加密
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "密码加密失败"))
		return
	}

	user := models.User{
		Email:    req.Email,
		Password: string(hashed),
		Name:     req.Name,
		Role:     "user",
	}
	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "注册失败"))
		return
	}

	// 生成 Token
	token, err := utils.GenerateToken(user.Email, h.cfg.JWTExpiration, h.cfg.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "生成Token失败"))
		return
	}

	c.JSON(http.StatusOK, utils.Success(dto.LoginResponse{
		Token: token,
		User:  toUserInfo(&user),
	}))
}

// session 获取当前会话
func (h *AuthHandler) session(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusOK, utils.Success(nil))
		return
	}
	c.JSON(http.StatusOK, utils.Success(toUserInfo(user)))
}

// toUserInfo 转换为不含密码的用户信息
func toUserInfo(user *models.User) dto.UserInfo {
	return dto.UserInfo{
		ID:    user.ID,
		Email: user.Email,
		Name:  user.Name,
		Role:  user.Role,
	}
}
