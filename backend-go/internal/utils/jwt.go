package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken 生成 JWT Token（HS256）
func GenerateToken(email string, expiration time.Duration, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub": email,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(expiration).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ParseToken 解析并校验 Token，返回邮箱
func ParseToken(tokenStr, secret string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("无效的签名算法")
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("无效的Token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("无效的Token claims")
	}

	email, ok := claims["sub"].(string)
	if !ok {
		return "", errors.New("Token中缺少邮箱")
	}
	return email, nil
}
