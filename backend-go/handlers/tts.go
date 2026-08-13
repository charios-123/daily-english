package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"daily-english-reader-backend/database"
	"daily-english-reader-backend/models"
	"daily-english-reader-backend/services"
	"daily-english-reader-backend/utils"

	"github.com/gin-gonic/gin"
)

// TtsHandler TTS 音频生成处理器
type TtsHandler struct {
	ttsService *services.TtsService
	cosService *services.CosService
}

// NewTtsHandler 创建 TTS 处理器
func NewTtsHandler(ttsService *services.TtsService, cosService *services.CosService) *TtsHandler {
	return &TtsHandler{ttsService: ttsService, cosService: cosService}
}

// Register 路由注册
func (h *TtsHandler) Register(r *gin.RouterGroup) {
	r.POST("/generate", h.generate)
}

// generate 为文章生成音频
func (h *TtsHandler) generate(c *gin.Context) {
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

	englishText := extractEnglishText(article.Content)
	if englishText == "" {
		c.JSON(http.StatusBadRequest, utils.Error(400, "文章没有英文内容"))
		return
	}

	// 限制文本长度（edge-tts 限制）
	if len(englishText) > 500 {
		englishText = englishText[:500]
	}

	// 调用 TTS 生成音频（含词级时间戳）
	result := h.ttsService.TextToSpeech(englishText)
	if result == nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "音频生成失败"))
		return
	}
	audioData := result.Audio

	// 上传到 COS
	fileName := "audio/article_" + timeToIDStr(article.ID) + ".mp3"
	audioURL, err := h.cosService.UploadBytes(fileName, audioData, "audio/mpeg")
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "音频上传失败"))
		return
	}

	// 更新数据库（存储文件名、词级时间戳）
	article.AudioURL = fileName
	duration := services.EstimateDuration(englishText)
	article.DurationSeconds = &duration
	if result.Boundaries != nil && len(result.Boundaries) > 0 {
		if boundariesJSON, err := json.Marshal(result.Boundaries); err == nil {
			article.WordBoundaries = boundariesJSON
		}
	}
	if err := database.DB.Save(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "音频信息保存失败"))
		return
	}

	// 生成预签名 URL 返回给前端
	presignedURL := h.cosService.GeneratePresignedURL(fileName)
	if presignedURL == "" {
		presignedURL = audioURL
	}

	c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
		"audioUrl":       presignedURL,
		"wordBoundaries": result.Boundaries,
		"message":        "音频生成成功",
	}))
}

// extractEnglishText 从文章 content JSON 中提取英文文本（拼接为句子）
func extractEnglishText(content []byte) string {
	if len(content) == 0 {
		return ""
	}
	var blocks []struct {
		En string `json:"en"`
	}
	if err := jsonUnmarshal(content, &blocks); err != nil {
		return ""
	}
	var sb strings.Builder
	for _, block := range blocks {
		if block.En != "" {
			if sb.Len() > 0 {
				sb.WriteString(". ")
			}
			sb.WriteString(block.En)
		}
	}
	return strings.TrimSpace(sb.String())
}

// timeToIDStr 辅助：将 ID 转为字符串
func timeToIDStr(id uint64) string {
	return uint64ToStr(id)
}
