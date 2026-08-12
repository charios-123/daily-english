package handlers

import (
	"net/http"
	"strings"

	"daily-english-reader-backend/database"
	"daily-english-reader-backend/models"
	"daily-english-reader-backend/services"
	"daily-english-reader-backend/utils"

	"github.com/gin-gonic/gin"
)

// AiHandler AI 知识点分析处理器
type AiHandler struct {
	aiService *services.AiService
}

// NewAiHandler 创建 AI 处理器
func NewAiHandler(aiService *services.AiService) *AiHandler {
	return &AiHandler{aiService: aiService}
}

// Register 路由注册
func (h *AiHandler) Register(r *gin.RouterGroup) {
	r.POST("/analyze", h.analyze)
}

// analyze 分析文章知识点
func (h *AiHandler) analyze(c *gin.Context) {
	var req struct {
		ArticleID uint64 `json:"articleId"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.ArticleID == 0 {
		c.JSON(http.StatusBadRequest, utils.Error(400, "文章ID不能为空"))
		return
	}

	var article models.Article
	if err := database.DB.First(&article, req.ArticleID).Error; err != nil {
		c.JSON(http.StatusNotFound, utils.Error(404, "文章不存在"))
		return
	}

	// 提取英文内容
	contentEn := extractEnglishContent(article.Content)

	// 调用 AI 分析（带缓存和降级兜底）
	analysis := h.aiService.AnalyzeArticleKnowledge(req.ArticleID, article.TitleEn, article.TitleZh, contentEn)

	c.JSON(http.StatusOK, utils.Success(map[string]string{"analysis": analysis}))
}

// extractEnglishContent 从文章 content JSON 中提取英文内容
func extractEnglishContent(content []byte) string {
	if len(content) == 0 {
		return ""
	}
	var blocks []struct {
		En string `json:"en"`
	}
	if err := jsonUnmarshal(content, &blocks); err != nil {
		return string(content)
	}
	var sb strings.Builder
	for _, block := range blocks {
		if block.En != "" {
			sb.WriteString(block.En)
			sb.WriteString("\n\n")
		}
	}
	return strings.TrimSpace(sb.String())
}
