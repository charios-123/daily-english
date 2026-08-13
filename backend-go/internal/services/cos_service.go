package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"daily-english-reader-backend/internal/config"

	"github.com/tencentyun/cos-go-sdk-v5"
)

// CosService 腾讯云 COS 存储服务
type CosService struct {
	cfg    *config.Config
	client *cos.Client
}

// NewCosService 创建 COS 服务
func NewCosService(cfg *config.Config) *CosService {
	bucketURL := &url.URL{
		Scheme: "https",
		Host:   fmt.Sprintf("%s.cos.%s.myqcloud.com", cfg.CosBucket, cfg.CosRegion),
	}
	base := &cos.BaseURL{BucketURL: bucketURL}
	client := cos.NewClient(base, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  cfg.CosSecretID,
			SecretKey: cfg.CosSecretKey,
		},
	})
	return &CosService{cfg: cfg, client: client}
}

// GetCredentials 获取临时上传凭证（简化实现，返回配置信息）
func (s *CosService) GetCredentials() map[string]interface{} {
	return map[string]interface{}{
		"secretId":      s.cfg.CosSecretID,
		"secretKey":     s.cfg.CosSecretKey,
		"region":        s.cfg.CosRegion,
		"bucket":        s.cfg.CosBucket,
		"allowedPrefix": s.cfg.CosAllowedPrefix,
	}
}

// UploadBytes 上传字节数据到 COS，返回文件访问 URL
func (s *CosService) UploadBytes(fileName string, data []byte, contentType string) (string, error) {
	return s.upload(fileName, strings.NewReader(string(data)), contentType)
}

// UploadStream 上传文件流（multipart 上传）
func (s *CosService) UploadStream(fileName string, reader io.Reader, contentType string, contentLength int64) (string, error) {
	return s.upload(fileName, reader, contentType)
}

// upload 上传数据到 COS
func (s *CosService) upload(fileName string, reader io.Reader, contentType string) (string, error) {
	ctx := context.Background()
	_, err := s.client.Object.Put(ctx, fileName, reader, &cos.ObjectPutOptions{
		ObjectPutHeaderOptions: &cos.ObjectPutHeaderOptions{
			ContentType: contentType,
		},
	})
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("https://%s.cos.%s.myqcloud.com/%s", s.cfg.CosBucket, s.cfg.CosRegion, fileName), nil
}

// GeneratePresignedURL 生成预签名 URL（默认 1 小时过期）
func (s *CosService) GeneratePresignedURL(fileName string) string {
	u, err := s.client.Object.GetPresignedURL(
		context.Background(),
		http.MethodGet,
		fileName,
		s.cfg.CosSecretID,
		s.cfg.CosSecretKey,
		time.Hour,
		nil,
	)
	if err != nil {
		return ""
	}
	return u.String()
}
