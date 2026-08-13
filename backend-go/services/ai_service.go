package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"daily-english-reader-backend/config"
)

// AiService AI 知识点分析服务：优先调用 DeepSeek 大模型，失败时降级为规则分析
type AiService struct {
	cfg      *config.Config
	client   *http.Client
	cache    map[uint64]string
	cacheMux sync.RWMutex
	rag      *RAGService
}

// NewAiService 创建 AI 服务
func NewAiService(cfg *config.Config, rag *RAGService) *AiService {
	return &AiService{
		cfg: cfg,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		cache: make(map[uint64]string),
		rag:   rag,
	}
}

// AnalyzeArticleKnowledge 分析文章知识点（带缓存，AI 失败自动降级）
func (s *AiService) AnalyzeArticleKnowledge(articleID uint64, titleEn, titleZh, contentEn string) string {
	// 1. 先检查缓存
	s.cacheMux.RLock()
	if cached, ok := s.cache[articleID]; ok {
		s.cacheMux.RUnlock()
		return cached
	}
	s.cacheMux.RUnlock()

	// 2. 通过 RAG 按文章检索段落切片作为上下文（精准且省 token；无切片时回退全文）
	knowledge := contentEn
	if s.rag != nil {
		if chunks := s.rag.RetrieveByArticle(articleID, 20); len(chunks) > 0 {
			contents := make([]string, 0, len(chunks))
			for _, ch := range chunks {
				contents = append(contents, ch.Content)
			}
			knowledge = strings.Join(contents, "\n\n")
		}
	}

	// 3. 调用 DeepSeek AI
	result, err := s.callDeepSeek(titleEn, titleZh, knowledge)
	if err != nil {
		// 4. 失败降级为规则分析（降级基于完整英文全文）
		fallback := s.generateFallbackAnalysis(titleEn, titleZh, contentEn)
		return fallback
	}

	// 4. 缓存成功结果
	s.cacheMux.Lock()
	s.cache[articleID] = result
	s.cacheMux.Unlock()

	return result
}

// callDeepSeek 调用 DeepSeek Chat Completions API（OpenAI 兼容，Bearer 直接鉴权）
func (s *AiService) callDeepSeek(titleEn, titleZh, contentEn string) (string, error) {
	return s.chatCompletion([]map[string]string{
		{"role": "user", "content": s.buildPrompt(titleEn, titleZh, contentEn)},
	})
}

// chatCompletion 统一的 DeepSeek 调用封装（所有 AI 能力共用）
func (s *AiService) chatCompletion(messages []map[string]string) (string, error) {
	url := s.cfg.DeepSeekBaseURL + "/chat/completions"

	body := map[string]interface{}{
		"model":       s.cfg.DeepSeekModel,
		"messages":    messages,
		"temperature": 0.7,
		"max_tokens":  2048,
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.DeepSeekAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("DeepSeek API调用失败: %d %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 || strings.TrimSpace(result.Choices[0].Message.Content) == "" {
		return "", errors.New("AI响应格式异常")
	}

	return result.Choices[0].Message.Content, nil
}

// AskWithRAG RAG 增强问答：基于检索到的知识切片 + DeepSeek 生成回答
func (s *AiService) AskWithRAG(question string, chunks []string) (string, error) {
	knowledge := strings.Join(chunks, "\n---\n")
	system := "你是一位英语学习助手。请基于提供的知识库内容回答用户问题，用中文回答。" +
		"每条知识内容以【文章标题】开头，请据此指出信息来自哪篇文章。" +
		"如果知识库内容不足以回答，请说明并给出基于常识的最佳回答。" +
		"回答要简洁（200字以内），可以引用知识库中的例句。"
	user := "知识库内容：\n" + knowledge + "\n\n用户问题：" + question

	return s.chatCompletion([]map[string]string{
		{"role": "system", "content": system},
		{"role": "user", "content": user},
	})
}

// ---- 降级兜底：基于规则的知识点分析 ----

var (
	stopWords   = map[string]bool{}
	commonWords = map[string][2]string{}
)

func init() {
	stopList := strings.Fields(`the a an is are was were be been being have has had do does did will would could should may might must shall can need dare to of in for on with at by from as into through during before after above below and but or nor so yet both either neither not only own same than too very just i you he she it we they me him her us them my your his its our their this that these those what which who whom if when where why how all each every some any no most many much few little there here now then always never often also well back still get got make made`)
	for _, w := range stopList {
		stopWords[w] = true
	}

	dict := map[string][2]string{
		"important": {"adj", "重要的"}, "learn": {"v", "学习"}, "read": {"v", "阅读"},
		"book": {"n", "书籍"}, "write": {"v", "写作"}, "speak": {"v", "说话"},
		"think": {"v", "思考"}, "know": {"v", "知道"}, "want": {"v", "想要"},
		"use": {"v", "使用"}, "find": {"v", "发现"}, "give": {"v", "给"},
		"tell": {"v", "告诉"}, "work": {"v/n", "工作"}, "life": {"n", "生活"},
		"day": {"n", "一天"}, "time": {"n", "时间"}, "people": {"n", "人们"},
		"year": {"n", "年"}, "way": {"n", "方式"}, "world": {"n", "世界"},
		"good": {"adj", "好的"}, "new": {"adj", "新的"}, "great": {"adj", "伟大的"},
		"help": {"v/n", "帮助"}, "feel": {"v", "感觉"}, "thing": {"n", "事情"},
		"man": {"n", "男人"}, "child": {"n", "孩子"}, "place": {"n", "地方"},
		"start": {"v", "开始"}, "change": {"v/n", "改变"}, "love": {"v/n", "爱"},
		"skill": {"n", "技能"}, "study": {"v", "学习"}, "future": {"n", "未来"},
		"technology": {"n", "科技"}, "language": {"n", "语言"}, "ai": {"n", "人工智能"},
		"artificial": {"adj", "人工的"}, "intelligence": {"n", "智能"}, "health": {"n", "健康"},
		"business": {"n", "商业"}, "company": {"n", "公司"}, "system": {"n", "系统"},
		"information": {"n", "信息"}, "computer": {"n", "电脑"}, "data": {"n", "数据"},
		"problem": {"n", "问题"}, "example": {"n", "例子"}, "part": {"n", "部分"},
		"question": {"n", "问题"}, "education": {"n", "教育"}, "opportunity": {"n", "机会"},
		"communication": {"n", "交流"}, "culture": {"n", "文化"}, "knowledge": {"n", "知识"},
	}
	commonWords = dict
}

// generateFallbackAnalysis 降级兜底分析
func (s *AiService) generateFallbackAnalysis(titleEn, titleZh, contentEn string) string {
	var b strings.Builder
	b.WriteString("# " + titleEn + "\n\n")
	b.WriteString("> **提示**：AI 分析服务暂时不可用，以下为基础知识点整理\n\n")

	// 1. 核心词汇
	b.WriteString("## 1. 核心词汇\n\n")
	keywords := extractKeywords(contentEn)
	if len(keywords) == 0 {
		b.WriteString("> 词汇提取暂时不可用，请稍后重试\n\n")
	} else {
		for _, kw := range keywords {
			b.WriteString(fmt.Sprintf("- **%s** (%s) — %s\n  - 例句：*The %s is an important word in this context.*\n", kw.word, kw.pos, kw.meaning, kw.word))
		}
		b.WriteString("\n")
	}

	// 2. 重点短语
	b.WriteString("## 2. 重点短语\n\n")
	phrases := extractPhrases(contentEn)
	if len(phrases) == 0 {
		b.WriteString("> 短语提取暂时不可用，请稍后重试\n\n")
	} else {
		for _, p := range phrases {
			b.WriteString(fmt.Sprintf("- **%s** — %s\n", p.phrase, p.meaning))
		}
		b.WriteString("\n")
	}

	// 3. 语法要点
	b.WriteString("## 3. 语法要点\n\n")
	grammar := identifyGrammar(contentEn)
	if len(grammar) == 0 {
		b.WriteString("- 建议关注文章中的时态和语态变化\n")
	} else {
		for _, g := range grammar {
			b.WriteString(fmt.Sprintf("- **%s**：%s\n", g.name, g.desc))
		}
	}
	b.WriteString("\n")

	// 4. 句型结构
	b.WriteString("## 4. 句型结构\n\n")
	b.WriteString("- 本文主要使用 **陈述句** 结构，描述客观事实或观点\n")
	b.WriteString("- 注意文章中的并列复合句和主从复合句的使用\n")
	b.WriteString("- 建议分析文章中出现的倒装句、强调句等特殊句型\n\n")

	// 5. 学习建议
	b.WriteString("## 5. 学习建议\n\n")
	b.WriteString("1. **通读全文**：先通读一遍，理解文章大意\n")
	b.WriteString("2. **标记生词**：遇到不认识的词汇先标记，读完后查词典\n")
	b.WriteString("3. **分析句子**：挑选复杂句子进行结构分析\n")
	b.WriteString("4. **跟读模仿**：配合音频进行跟读练习\n")
	b.WriteString("5. **复述练习**：用自己的话复述文章内容\n\n")

	b.WriteString("---\n\n")
	b.WriteString("*AI 分析服务恢复后，将提供更详细的知识点分析*\n")

	return b.String()
}

// buildPrompt 构造 AI 提示词
func (s *AiService) buildPrompt(titleEn, titleZh, contentEn string) string {
	return `你是一位专业的英语教师。请分析以下英语文章的知识点，用中文回答。

文章标题：` + titleEn + `（` + titleZh + `）

文章内容：
` + contentEn + `

请从以下几个方面分析：
1. **核心词汇**：列出文章中的重要词汇（5-8个），包含音标、词性、中文释义和例句
2. **重点短语**：列出文章中的关键短语（3-5个），包含释义和用法
3. **语法要点**：分析文章中出现的语法现象（2-3个），包含规则说明和例句
4. **句型结构**：提取文章中的典型句型（2-3个），分析其结构
5. **文化背景**：如有相关文化背景知识，请简要介绍

请使用 Markdown 格式输出，每个部分用标题分隔，内容要简洁明了，便于学习者理解。`
}

// ---- 规则分析辅助 ----

type keywordInfo struct {
	word    string
	pos     string
	meaning string
}

type phraseInfo struct {
	phrase  string
	meaning string
}

type grammarInfo struct {
	name string
	desc string
}

// extractKeywords 基于词频和词典匹配提取关键词
func extractKeywords(content string) []keywordInfo {
	re := regexp.MustCompile(`[^a-z\s]`)
	words := strings.Fields(re.ReplaceAllString(strings.ToLower(content), " "))

	// 统计词频（排除停用词）
	counts := map[string]int{}
	for _, w := range words {
		if !stopWords[w] && len(w) > 3 {
			counts[w]++
		}
	}

	// 按词频排序取前 8 个
	type kv struct {
		k string
		v int
	}
	list := make([]kv, 0, len(counts))
	for k, v := range counts {
		list = append(list, kv{k, v})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].v > list[j].v })
	if len(list) > 8 {
		list = list[:8]
	}

	// 匹配词典
	var keywords []keywordInfo
	for _, item := range list {
		if info, ok := commonWords[item.k]; ok {
			keywords = append(keywords, keywordInfo{word: item.k, pos: info[0], meaning: info[1]})
		}
	}
	return keywords
}

// extractPhrases 提取常见短语
func extractPhrases(content string) []phraseInfo {
	commonPhrases := [][2]string{
		{"a lot of", "许多，大量"}, {"look forward to", "期待"}, {"take care of", "照顾"},
		{"work on", "从事，致力于"}, {"find out", "发现，查明"}, {"come up with", "想出，提出"},
		{"as well as", "以及，和"}, {"in order to", "为了"}, {"because of", "因为"},
		{"instead of", "代替，而不是"}, {"at least", "至少"}, {"no longer", "不再"},
		{"make sure", "确保"}, {"pay attention", "注意"}, {"deal with", "处理"},
		{"depend on", "取决于"}, {"believe in", "相信，信任"}, {"lead to", "导致"},
		{"result in", "导致"}, {"refer to", "指代，参考"}, {"consist of", "由...组成"},
		{"divide into", "分成"}, {"communicate with", "与...交流"}, {"be interested in", "对...感兴趣"},
		{"have something in common", "有共同之处"},
	}

	lower := strings.ToLower(content)
	var phrases []phraseInfo
	for _, p := range commonPhrases {
		if strings.Contains(lower, p[0]) {
			phrases = append(phrases, phraseInfo{phrase: p[0], meaning: p[1]})
			if len(phrases) >= 5 {
				break
			}
		}
	}
	return phrases
}

// identifyGrammar 识别语法要点（时态分析）
func identifyGrammar(content string) []grammarInfo {
	var grammar []grammarInfo
	if strings.Contains(content, "is ") || strings.Contains(content, "are ") ||
		strings.Contains(content, "was ") || strings.Contains(content, "were ") {
		grammar = append(grammar, grammarInfo{"现在/过去进行时", "描述正在发生的动作或状态，使用 be + doing 结构"})
	}
	if strings.Contains(content, "will ") || strings.Contains(content, "would ") {
		grammar = append(grammar, grammarInfo{"将来时/过去将来时", "表达未来的动作或习惯性的未来动作"})
	}
	if strings.Contains(content, "have ") || strings.Contains(content, "has ") || strings.Contains(content, "had ") {
		grammar = append(grammar, grammarInfo{"完成时", "描述已完成的动作或对现在的影响"})
	}
	if strings.Contains(content, "can ") || strings.Contains(content, "could ") || strings.Contains(content, "should ") {
		grammar = append(grammar, grammarInfo{"情态动词", "表达能力、可能性、建议等"})
	}
	if ok, _ := regexp.MatchString(`\bif\b.*would`, strings.ToLower(content)); ok {
		grammar = append(grammar, grammarInfo{"虚拟语气", "表达假设或非真实的条件"})
	}
	return grammar
}
