package handlers

import (
	"net/http"
	"path"
	"strings"

	"daily-english-reader-backend/internal/services"
	"daily-english-reader-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// CosHandler 腾讯云 COS 处理器
type CosHandler struct {
	cosService *services.CosService
}

// NewCosHandler 创建 COS 处理器
func NewCosHandler(cosService *services.CosService) *CosHandler {
	return &CosHandler{cosService: cosService}
}

// Register 路由注册
func (h *CosHandler) Register(r *gin.RouterGroup) {
	r.GET("/credentials", h.getCredentials)
	r.POST("/upload", h.uploadFile)
}

// getCredentials 获取临时上传凭证
func (h *CosHandler) getCredentials(c *gin.Context) {
	c.JSON(http.StatusOK, utils.Success(h.cosService.GetCredentials()))
}

// uploadFile 上传文件到 COS
func (h *CosHandler) uploadFile(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.Error(400, "缺少文件"))
		return
	}

	originalFilename := fileHeader.Filename
	extension := path.Ext(originalFilename)
	fileName := "audio/" + randomUUID() + extension

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "读取文件失败"))
		return
	}
	defer file.Close()

	url, err := h.cosService.UploadStream(fileName, file, detectContentType(extension), fileHeader.Size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.Error(500, "文件上传失败: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, utils.Success(map[string]interface{}{
		"url":              url,
		"fileName":         fileName,
		"originalFilename": originalFilename,
		"size":             fileHeader.Size,
	}))
}

// detectContentType 根据扩展名推断内容类型
func detectContentType(extension string) string {
	switch strings.ToLower(extension) {
	case ".mp3":
		return "audio/mpeg"
	case ".mp4":
		return "video/mp4"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}
