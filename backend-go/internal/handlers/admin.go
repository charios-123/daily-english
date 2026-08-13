package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"daily-english-reader-backend/internal/config"
	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/dto"
	"daily-english-reader-backend/internal/middleware"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// AdminHandler 管理后台处理器
type AdminHandler struct{}

// NewAdminHandler 创建管理后台处理器
func NewAdminHandler() *AdminHandler {
	return &AdminHandler{}
}

// Register 路由注册（需要管理员权限）
func (h *AdminHandler) Register(r *gin.RouterGroup, cfg *config.Config) {
	admin := r.Group("/admin", middleware.AuthMiddleware(cfg), middleware.AdminMiddleware())

	// 文章管理
	admin.GET("/articles", h.adminGetArticles)
	admin.GET("/articles/:id", h.adminGetArticleByID)
	admin.POST("/articles", h.adminCreateArticle)
	admin.PUT("/articles/:id", h.adminUpdateArticle)
	admin.DELETE("/articles/:id", h.adminDeleteArticle)

	// 用户管理
	admin.GET("/users", h.adminGetUsers)
	admin.GET("/users/:id", h.adminGetUserByID)
	admin.PUT("/users/:id/role", h.adminUpdateUserRole)

	// 仪表盘
	admin.GET("/dashboard", h.adminDashboard)
}

// ---- 文章管理 ----

func (h *AdminHandler) adminGetArticles(c *gin.Context) {
	page := parsePage(c.DefaultQuery("page", "1"))
	size := parsePage(c.DefaultQuery("size", "20"))
	difficulty := c.Query("difficulty")

	var articles []models.Article
	var total int64

	query := database.DB.Model(&models.Article{})
	if difficulty != "" {
		query = query.Where("difficulty = ?", strings.ToLower(difficulty))
	}
	query.Count(&total)
	query.Order("date DESC").Offset((page - 1) * size).Limit(size).Find(&articles)

	c.JSON(http.StatusOK, utils.Success(dto.PageResult{
		Records: articles,
		Total:   total,
		Size:    size,
		Current: page,
		Pages:   (total + int64(size) - 1) / int64(size),
	}))
}

func (h *AdminHandler) adminGetArticleByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的文章ID"))
		return
	}
	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.Error(404, "文章不存在"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(article))
}

func (h *AdminHandler) adminCreateArticle(c *gin.Context) {
	var req models.Article
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "文章数据不合法"))
		return
	}
	if req.TitleEn == "" || req.TitleZh == "" {
		c.JSON(http.StatusBadRequest, utils.Error(400, "标题不能为空"))
		return
	}
	// 设置默认日期
	if time.Time(req.Date).IsZero() {
		req.Date = datatypes.Date(time.Now())
	}
	if err := database.DB.Create(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "创建文章失败"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(req))
}

func (h *AdminHandler) adminUpdateArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的文章ID"))
		return
	}
	var req models.Article
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "文章数据不合法"))
		return
	}
	req.ID = id
	if err := database.DB.Save(&req).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "更新文章失败"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(req))
}

func (h *AdminHandler) adminDeleteArticle(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的文章ID"))
		return
	}
	if err := database.DB.Delete(&models.Article{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "删除文章失败"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(nil))
}

// ---- 用户管理 ----

func (h *AdminHandler) adminGetUsers(c *gin.Context) {
	page := parsePage(c.DefaultQuery("page", "1"))
	size := parsePage(c.DefaultQuery("size", "20"))

	var users []models.User
	var total int64

	database.DB.Model(&models.User{}).Count(&total)
	database.DB.Order("id DESC").Offset((page - 1) * size).Limit(size).Find(&users)

	c.JSON(http.StatusOK, utils.Success(dto.PageResult{
		Records: users, // Password 已通过 json:"-" 隐藏
		Total:   total,
		Size:    size,
		Current: page,
		Pages:   (total + int64(size) - 1) / int64(size),
	}))
}

func (h *AdminHandler) adminGetUserByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的用户ID"))
		return
	}
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.Error(404, "用户不存在"))
		return
	}
	c.JSON(http.StatusOK, utils.Success(user))
}

func (h *AdminHandler) adminUpdateUserRole(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的用户ID"))
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "请求数据不合法"))
		return
	}
	if req.Role != "user" && req.Role != "admin" {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的角色"))
		return
	}
	var user models.User
	if err := database.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.Error(404, "用户不存在"))
		return
	}
	user.Role = req.Role
	database.DB.Save(&user)
	c.JSON(http.StatusOK, utils.Success(nil))
}

// ---- 仪表盘 ----

func (h *AdminHandler) adminDashboard(c *gin.Context) {
	var totalUsers, totalArticles, adminCount, newUsers7Days int64

	database.DB.Model(&models.User{}).Count(&totalUsers)
	database.DB.Model(&models.Article{}).Count(&totalArticles)
	database.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&adminCount)
	database.DB.Model(&models.User{}).Where("created_at >= ?", time.Now().AddDate(0, 0, -7)).Count(&newUsers7Days)

	c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
		"totalUsers":    totalUsers,
		"totalArticles": totalArticles,
		"adminCount":    adminCount,
		"newUsers7Days": newUsers7Days,
	}))
}
