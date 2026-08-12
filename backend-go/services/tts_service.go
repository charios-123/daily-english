package services

import (
	"bytes"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// TtsService 文本转语音服务（通过 Node.js 脚本调用 edge-tts，免费）
type TtsService struct {
	scriptPath string
}

// NewTtsService 创建 TTS 服务
func NewTtsService() *TtsService {
	// 优先使用当前目录下的 tts-script.mjs
	dir, err := os.Getwd()
	script := "tts-script.mjs"
	if err == nil {
		script = filepath.Join(dir, "tts-script.mjs")
	}
	return &TtsService{scriptPath: script}
}

// TextToSpeech 将文本转换为 MP3 字节数据
func (s *TtsService) TextToSpeech(text string) []byte {
	// 创建临时音频文件
	tmpFile, err := os.CreateTemp("", "tts-*.mp3")
	if err != nil {
		log.Printf("创建临时文件失败: %v", err)
		return nil
	}
	tmpPath := tmpFile.Name()
	tmpFile.Close()
	defer os.Remove(tmpPath)

	// 调用 Node.js 脚本
	cmd := exec.Command("node", s.scriptPath, text, tmpPath)
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

	log.Printf("音频生成成功，大小: %d bytes", len(data))
	return data
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
