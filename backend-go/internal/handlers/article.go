package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/dto"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/services"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// ArticleHandler 文章相关处理器
type ArticleHandler struct {
	cosService *services.CosService
}

// NewArticleHandler 创建文章处理器
func NewArticleHandler(cosService *services.CosService) *ArticleHandler {
	return &ArticleHandler{cosService: cosService}
}

// Register 路由注册（公开 GET 接口）
func (h *ArticleHandler) Register(r *gin.RouterGroup) {
	r.GET("", h.getArticles)
	r.GET("/today", h.getTodayArticle)
	r.GET("/:id", h.getArticleById)
}

// getArticles 获取文章列表（分页）
func (h *ArticleHandler) getArticles(c *gin.Context) {
	page := parsePage(c.DefaultQuery("page", "1"))
	size := parsePage(c.DefaultQuery("size", "10"))
	difficulty := c.Query("difficulty")

	// 数据库不可用时直接降级到本地数据
	if !database.IsAvailable() {
		fallback := getFallbackArticles()
		h.presignAll(fallback)
		pageResult := buildPageResult(fallback, page, size)
		c.JSON(http.StatusOK, utils.Success(pageResult))
		return
	}

	var articles []models.Article
	var total int64

	query := database.DB.Model(&models.Article{})
	if difficulty != "" {
		query = query.Where("difficulty = ?", strings.ToLower(difficulty))
	}
	query = query.Order("date DESC")

	// 尝试查询数据库，失败则降级到本地数据
	if err := query.Count(&total).Error; err != nil {
		// 数据库不可用，降级
		fallback := getFallbackArticles()
		h.presignAll(fallback)
		pageResult := buildPageResult(fallback, page, size)
		c.JSON(http.StatusOK, utils.Success(pageResult))
		return
	}

	if err := query.Offset((page - 1) * size).Limit(size).Find(&articles).Error; err != nil {
		// 数据库不可用，降级
		fallback := getFallbackArticles()
		h.presignAll(fallback)
		pageResult := buildPageResult(fallback, page, size)
		c.JSON(http.StatusOK, utils.Success(pageResult))
		return
	}

	// 为音频 URL 生成预签名
	h.presignAll(articles)

	pageResult := dto.PageResult{
		Records: articles,
		Total:   total,
		Size:    size,
		Current: page,
		Pages:   (total + int64(size) - 1) / int64(size),
	}
	c.JSON(http.StatusOK, utils.Success(pageResult))
}

// getArticleById 获取文章详情
func (h *ArticleHandler) getArticleById(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "无效的文章ID"))
		return
	}

	// 数据库不可用时直接降级
	if !database.IsAvailable() {
		fallback := getFallbackArticle(id)
		h.presign(&fallback)
		c.JSON(http.StatusOK, utils.Success(fallback))
		return
	}

	var article models.Article
	if err := database.DB.First(&article, id).Error; err != nil {
		// 数据库查询失败：可能是数据库不可用或文章不存在
		// 先尝试判断数据库是否可用
		var check models.Article
		if dbErr := database.DB.First(&check).Error; dbErr != nil {
			// 数据库不可用，降级
			fallback := getFallbackArticle(id)
			h.presign(&fallback)
			c.JSON(http.StatusOK, utils.Success(fallback))
			return
		}
		// 数据库可用但文章不存在
		c.JSON(http.StatusNotFound, utils.Error(404, "文章不存在"))
		return
	}

	h.presign(&article)
	c.JSON(http.StatusOK, utils.Success(article))
}

// getTodayArticle 获取今日文章
func (h *ArticleHandler) getTodayArticle(c *gin.Context) {
	today := datatypes.Date(time.Now())

	// 数据库不可用时直接降级
	if !database.IsAvailable() {
		fallback := getFallbackArticle(999)
		h.presign(&fallback)
		c.JSON(http.StatusOK, utils.Success(fallback))
		return
	}

	var article models.Article
	if err := database.DB.Where("date = ?", today).First(&article).Error; err != nil {
		// 今日无文章，返回最新一篇
		if err := database.DB.Order("date DESC").First(&article).Error; err != nil {
			// 数据库不可用，降级
			fallback := getFallbackArticle(999)
			h.presign(&fallback)
			c.JSON(http.StatusOK, utils.Success(fallback))
			return
		}
	}

	h.presign(&article)
	c.JSON(http.StatusOK, utils.Success(article))
}

// presignAll 为文章列表中的音频 URL 生成预签名
func (h *ArticleHandler) presignAll(articles []models.Article) {
	for i := range articles {
		h.presign(&articles[i])
	}
}

// presign 为单个文章的音频 URL 生成预签名
func (h *ArticleHandler) presign(article *models.Article) {
	if article == nil || article.AudioURL == "" {
		return
	}
	// 如果是 COS 文件名（不是完整 URL），生成预签名 URL
	if !strings.HasPrefix(article.AudioURL, "http") {
		if presigned := h.cosService.GeneratePresignedURL(article.AudioURL); presigned != "" {
			article.AudioURL = presigned
		}
	}
}

// parsePage 解析分页参数
func parsePage(val string) int {
	n, err := strconv.Atoi(val)
	if err != nil || n < 1 {
		return 1
	}
	return n
}

// buildPageResult 构造分页结果
func buildPageResult(articles []models.Article, page, size int) dto.PageResult {
	total := int64(len(articles))
	start := (page - 1) * size
	end := start + size
	if start >= len(articles) {
		articles = []models.Article{}
	} else if end > len(articles) {
		articles = articles[start:]
	} else {
		articles = articles[start:end]
	}
	return dto.PageResult{
		Records: articles,
		Total:   total,
		Size:    size,
		Current: page,
		Pages:   (total + int64(size) - 1) / int64(size),
	}
}

// getFallbackArticles 数据库不可用时的降级文章列表
func getFallbackArticles() []models.Article {
	duration := 60
	return []models.Article{
		createFallbackArticle(1, "2024-01-01", "The Importance of Reading", "阅读的重要性",
			"Reading is a fundamental skill that opens doors to knowledge and understanding.",
			"阅读是一项基本技能，为知识和理解打开了大门。", "beginner", &duration),
		createFallbackArticle(2, "2024-01-02", "Learning English", "学习英语",
			"Learning English is essential in today's globalized world.",
			"在当今全球化的世界中，学习英语至关重要。", "beginner", &duration),
		createFallbackArticle(3, "2024-01-03", "Technology and Daily Life", "科技与日常生活",
			"Technology has significantly changed the way we live and work.",
			"科技已经显著改变了我们的生活和工作方式。", "intermediate", &duration),
	}
}

// getFallbackArticle 单篇降级文章
func getFallbackArticle(id uint64) models.Article {
	duration := 60
	return createFallbackArticle(id, time.Now().Format("2006-01-02"), "Welcome to Daily English", "欢迎来到每日英语",
		"Welcome to Daily English Reader! This is a fallback article when database is unavailable.",
		"欢迎来到每日英语阅读器！当数据库不可用时，这是一篇备用文章。", "beginner", &duration)
}

// createFallbackArticle 构造降级文章
func createFallbackArticle(id uint64, date, titleEn, titleZh, summaryEn, summaryZh, difficulty string, duration *int) models.Article {
	content := datatypes.JSON([]byte(`[{"en":"` + escapeJSON(summaryEn) + `","zh":"` + escapeJSON(summaryZh) + `"}]`))
	d, _ := time.Parse("2006-01-02", date)
	return models.Article{
		ID:              id,
		Date:            datatypes.Date(d),
		TitleEn:         titleEn,
		TitleZh:         titleZh,
		SummaryEn:       summaryEn,
		SummaryZh:       summaryZh,
		Content:         content,
		Difficulty:      difficulty,
		DurationSeconds: duration,
		AudioURL:        "",
	}
}

// escapeJSON 简单的 JSON 转义
func escapeJSON(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `"`, `\"`)
	return s
}
