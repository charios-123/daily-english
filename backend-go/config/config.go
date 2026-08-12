package config

import (
	"os"
	"strconv"
	"time"
)

// Config 全局配置，从环境变量读取，带默认值（与旧 Java 后端 application.yml 保持一致）
type Config struct {
	ServerPort string
	DBUser     string
	DBPassword string
	DBHost     string
	DBPort     string
	DBName     string

	JWTSecret     string
	JWTExpiration time.Duration

	CosSecretID      string
	CosSecretKey     string
	CosRegion        string
	CosBucket        string
	CosAllowedPrefix string

	AdminEmail    string
	AdminPassword string
	AdminName     string

	ZhipuAPIKey  string
	ZhipuBaseURL string
	ZhipuModel   string

	TTSVoiceType int
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

// Load 加载配置
func Load() *Config {
	return &Config{
		ServerPort: getEnv("SERVER_PORT", "8081"),

		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", "123456"),
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBName:     getEnv("DB_NAME", "daily_english"),

		JWTSecret:     getEnv("JWT_SECRET", "daily-english-reader-secret-key-must-be-at-least-256-bits-long-for-hs256"),
		JWTExpiration: time.Duration(getEnvInt("JWT_EXPIRATION_MS", 86400000)) * time.Millisecond,

		// 密钥一律从环境变量（或 .env 文件）读取，不内置默认值，避免泄露
		CosSecretID:      getEnv("COS_SECRET_ID", ""),
		CosSecretKey:     getEnv("COS_SECRET_KEY", ""),
		CosRegion:        getEnv("COS_REGION", "ap-guangzhou"),
		CosBucket:        getEnv("COS_BUCKET", "daily-english-audio-1440504189"),
		CosAllowedPrefix: getEnv("COS_ALLOWED_PREFIX", "audio/"),

		AdminEmail:    getEnv("ADMIN_EMAIL", "admin@example.com"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "admin123"),
		AdminName:     getEnv("ADMIN_NAME", "Admin"),

		ZhipuAPIKey:  getEnv("ZHIPU_API_KEY", ""),
		ZhipuBaseURL: getEnv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4"),
		ZhipuModel:   getEnv("ZHIPU_MODEL", "glm-4-flash"),

		TTSVoiceType: getEnvInt("TTS_VOICE_TYPE", 0),
	}
}
