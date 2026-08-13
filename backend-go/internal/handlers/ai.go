package handlers

import (
	"net/http"
	"strings"

	"daily-english-reader-backend/internal/database"
	"daily-english-reader-backend/internal/models"
	"daily-english-reader-backend/internal/services"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// AiHandler AI 知识点分析处理器
type AiHandler struct {
	aiService  *services.AiService
	ragService *services.RAGService
}

// NewAiHandler 创建 AI 处理器
func NewAiHandler(aiService *services.AiService, ragService *services.RAGService) *AiHandler {
	return &AiHandler{aiService: aiService, ragService: ragService}
}

// Register 路由注册
func (h *AiHandler) Register(r *gin.RouterGroup) {
	r.POST("/analyze", h.analyze)
	r.POST("/ask", h.ask)
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

// ask RAG 增强问答：检索知识库 → DeepSeek 生成 → 失败降级返回检索内容
func (h *AiHandler) ask(c *gin.Context) {
	var req struct {
		Question string `json:"question"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Question) == "" {
		c.JSON(http.StatusBadRequest, utils.Error(400, "问题不能为空"))
		return
	}

	// 1. RAG 检索最相关的知识切片
	chunks := h.ragService.Retrieve(req.Question, 3)
	if len(chunks) == 0 {
		c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
			"answer":  "知识库中暂未检索到相关内容，请尝试提问其他主题（如文章中的词汇、短语、语法）。",
			"sources": []interface{}{},
		}))
		return
	}

	contents := make([]string, 0, len(chunks))
	for _, ch := range chunks {
		content := ch.Content
		if ch.Title != "" {
			content = "【" + ch.Title + "】" + content
		}
		contents = append(contents, content)
	}

	// 2. DeepSeek 基于检索内容生成回答（失败降级为返回检索原文）
	answer, err := h.aiService.AskWithRAG(req.Question, contents)
	if err != nil {
		answer = "（AI 生成暂时不可用，以下为知识库中检索到的相关内容）\n\n" + strings.Join(contents, "\n\n")
	}

	c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
		"answer":  answer,
		"sources": contents,
	}))
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
