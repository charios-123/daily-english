package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"strconv"
	"time"
)

// jsonUnmarshal 解析 JSON
func jsonUnmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}

// uint64ToStr 将 uint64 转为字符串
func uint64ToStr(id uint64) string {
	return strconv.FormatUint(id, 10)
}

// nowMillis 当前毫秒时间戳
func nowMillis() int64 {
	return time.Now().UnixMilli()
}

// randomUUID 生成随机文件名字符串
func randomUUID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return strconv.FormatInt(nowMillis(), 10)
	}
	return hex.EncodeToString(buf)
}
