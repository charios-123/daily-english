package services

import (
	"bytes"
	"encoding/json"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// WordBoundary 单词级时间戳（秒）
type WordBoundary struct {
	Word     string  `json:"word"`
	Offset   float64 `json:"offset"`
	Duration float64 `json:"duration"`
}

// TtsResult TTS 生成结果：音频数据 + 词级时间戳
type TtsResult struct {
	Audio      []byte
	Boundaries []WordBoundary
}

// TtsService 文本转语音服务（通过 Node.js 脚本调用 edge-tts，免费）
type TtsService struct {
	scriptPath string
}

// NewTtsService 创建 TTS 服务
func NewTtsService() *TtsService {
	// 优先使用项目根目录 scripts/ 下的 tts-script.mjs
	dir, err := os.Getwd()
	script := filepath.Join("scripts", "tts-script.mjs")
	if err == nil {
		script = filepath.Join(dir, "scripts", "tts-script.mjs")
	}
	return &TtsService{scriptPath: script}
}

// TextToSpeech 将文本转换为 MP3 字节数据，并采集词级时间戳
func (s *TtsService) TextToSpeech(text string) *TtsResult {
	// 创建临时音频和元数据文件
	tmpFile, err := os.CreateTemp("", "tts-*.mp3")
	if err != nil {
		log.Printf("创建临时文件失败: %v", err)
		return nil
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	metaFile, err := os.CreateTemp("", "tts-*.json")
	if err != nil {
		log.Printf("创建临时元数据文件失败: %v", err)
		return nil
	}
	metaPath := metaFile.Name()
	metaFile.Close()
	defer os.Remove(metaPath)

	// 调用 Node.js 脚本
	cmd := exec.Command("node", s.scriptPath, text, tmpPath, metaPath)
	cmd.Env = os.Environ()
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	if err := cmd.Run(); err != nil {
		log.Printf("edge-tts 执行失败: %v, 输出: %s", err, strings.TrimSpace(out.String()))
		return nil
	}

	// 检查音频文件
	data, err := os.ReadFile(tmpPath)
	if err != nil || len(data) == 0 {
		log.Printf("音频文件不存在或为空")
		return nil
	}

	// 解析词级时间戳
	var boundaries []WordBoundary
	if metaData, err := os.ReadFile(metaPath); err == nil && len(metaData) > 0 {
		if err := json.Unmarshal(metaData, &boundaries); err != nil {
			log.Printf("解析词级时间戳失败: %v", err)
		}
	}

	log.Printf("音频生成成功，大小: %d bytes，词级时间戳: %d 个", len(data), len(boundaries))
	return &TtsResult{Audio: data, Boundaries: boundaries}
}

// EstimateDuration 估算音频时长（英文约150词/分钟，与 Java 版 ceil(wordCount/2.5) 一致）
func EstimateDuration(text string) int {
	wordCount := len(strings.Fields(text))
	duration := (wordCount*2 + 4) / 5 // ceil(wordCount / 2.5)
	if duration < 1 {
		return 1
	}
	return duration
}
