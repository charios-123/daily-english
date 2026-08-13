package services

import (
	"encoding/json"
	"log"
	"math"
	"regexp"
	"sort"
	"strings"
	"sync"

	"daily-english-reader-backend/database"
	"daily-english-reader-backend/models"
)

// RAGService 检索增强生成服务（轻量实现：词频向量 + 余弦相似度检索，无需外部向量数据库）
type RAGService struct {
	mux    sync.RWMutex
	chunks []*models.KnowledgeChunk
	titles map[uint64]string // articleID → 英文标题（检索结果附带来源，供 AI 引用）
	built  bool
}

// RetrievalResult 检索结果
type RetrievalResult struct {
	ArticleID uint64  `json:"articleId"`
	Title     string  `json:"title"`
	Content   string  `json:"content"`
	Score     float64 `json:"score"`
}

// NewRAGService 创建 RAG 服务
func NewRAGService() *RAGService {
	return &RAGService{}
}

// ---- 向量化 ----

// 停用词表（英文高频虚词，检索时忽略）
var ragStopWords = func() map[string]bool {
	m := map[string]bool{}
	for _, w := range strings.Fields(`the a an is are was were be been being have has had do does did will would could should may might must shall can need to of in for on with at by from as into through during before after above below and but or nor so yet both either neither not only own same than too very just i you he she it we they me him her us them my your his its our their this that these those what which who whom if when where why how all each every some any no most many much few little there here now then always never often also well back still get got make made it's don't i'm that's`) {
		m[w] = true
	}
	return m
}()

var ragCleanRe = regexp.MustCompile(`[^a-z0-9\s]`)

// vectorize 分词并统计词频（英文词 + 中文字符，支持中英混合查询）
func vectorize(text string) map[string]float64 {
	vec := map[string]float64{}
	clean := ragCleanRe.ReplaceAllString(strings.ToLower(text), " ")
	for _, w := range strings.Fields(clean) {
		if ragStopWords[w] || len(w) < 2 {
			continue
		}
		vec[w]++
	}
	// 中文字符频率（与知识切片中的中文释义匹配，解决纯中文查询检索为空的问题）
	for _, r := range text {
		if r >= 0x4e00 && r <= 0x9fff {
			vec[string(r)]++
		}
	}
	return vec
}

// cosine 余弦相似度
func cosine(a, b map[string]float64) float64 {
	var dot, na, nb float64
	for k, v := range a {
		if bv, ok := b[k]; ok {
			dot += v * bv
		}
		na += v * v
	}
	for _, v := range b {
		nb += v * v
	}
	if na == 0 || nb == 0 {
		return 0
	}
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}

// ---- 知识库构建 ----

// ensureBuilt 确保知识库已加载：优先从数据库读取，为空则从文章切块构建
func (s *RAGService) ensureBuilt() {
	s.mux.RLock()
	if s.built {
		s.mux.RUnlock()
		return
	}
	s.mux.RUnlock()

	s.mux.Lock()
	defer s.mux.Unlock()
	if s.built {
		return
	}

	// 加载文章标题映射（检索结果附带来源文章）
	s.loadTitles()

	// 从数据库加载已有切片
	var chunks []models.KnowledgeChunk
	if err := database.DB.Find(&chunks).Error; err != nil {
		log.Printf("RAG 加载知识库失败: %v", err)
		s.built = true
		return
	}
	for i := range chunks {
		s.chunks = append(s.chunks, &chunks[i])
	}

	if len(s.chunks) == 0 {
		s.buildFromArticles()
	} else {
		log.Printf("RAG 知识库加载完成：%d 个切片", len(s.chunks))
	}
	s.built = true
}

// loadTitles 加载文章标题映射（调用方需持有写锁）
func (s *RAGService) loadTitles() {
	s.titles = map[uint64]string{}
	if !database.IsAvailable() {
		return
	}
	var articles []models.Article
	if err := database.DB.Select("id", "title_en").Find(&articles).Error; err != nil {
		log.Printf("RAG 加载文章标题失败: %v", err)
		return
	}
	for _, a := range articles {
		s.titles[a.ID] = a.TitleEn
	}
}

// buildFromArticles 从全部文章切块构建知识库
func (s *RAGService) buildFromArticles() {
	if !database.IsAvailable() {
		return
	}
	var articles []models.Article
	if err := database.DB.Find(&articles).Error; err != nil {
		log.Printf("RAG 构建失败（读取文章）: %v", err)
		return
	}

	// 清空旧切片
	database.DB.Where("1 = 1").Delete(&models.KnowledgeChunk{})

	for _, a := range articles {
		s.chunkArticle(a)
	}
	log.Printf("RAG 知识库构建完成：%d 个切片", len(s.chunks))
}

// chunkArticle 将一篇文章按段落切块并向量化入库
func (s *RAGService) chunkArticle(a models.Article) {
	var blocks []struct {
		En string `json:"en"`
		Zh string `json:"zh"`
	}
	if err := json.Unmarshal(a.Content, &blocks); err != nil {
		return
	}
	for _, b := range blocks {
		en := strings.TrimSpace(b.En)
		if en == "" {
			continue
		}
		content := en
		if b.Zh != "" {
			content += "\n中文释义：" + b.Zh
		}
		chunk := models.KnowledgeChunk{
			ArticleID: a.ID,
			ChunkType: "paragraph",
			Content:   content,
		}
		// 向量基于完整切片内容（英文 + 中文释义）计算，保证中文查询也能命中
		if vec := vectorize(content); len(vec) > 0 {
			if vecJSON, err := json.Marshal(vec); err == nil {
				chunk.Vector = vecJSON
			}
		}
		if err := database.DB.Create(&chunk).Error; err != nil {
			log.Printf("知识切片保存失败: %v", err)
			continue
		}
		s.chunks = append(s.chunks, &chunk)
	}
}

// ---- 检索 ----

// RetrieveByArticle 按文章检索：返回该篇文章的知识切片（知识点分析用，避免串入其他文章内容）
func (s *RAGService) RetrieveByArticle(articleID uint64, topK int) []RetrievalResult {
	s.ensureBuilt()
	if topK <= 0 {
		topK = 20
	}

	s.mux.RLock()
	chunks := s.chunks
	s.mux.RUnlock()

	var results []RetrievalResult
	for _, ch := range chunks {
		if ch.ArticleID == articleID {
			results = append(results, RetrievalResult{
				ArticleID: ch.ArticleID,
				Title:     s.titles[ch.ArticleID],
				Content:   ch.Content,
			})
			if len(results) >= topK {
				break
			}
		}
	}
	return results
}

// Retrieve 检索与查询最相关的 topK 个知识切片（余弦相似度）
func (s *RAGService) Retrieve(query string, topK int) []RetrievalResult {
	s.ensureBuilt()
	if topK <= 0 {
		topK = 3
	}

	s.mux.RLock()
	chunks := s.chunks
	s.mux.RUnlock()

	qvec := vectorize(query)
	type scored struct {
		ch  *models.KnowledgeChunk
		sim float64
	}
	var results []scored
	for _, ch := range chunks {
		var vec map[string]float64
		if err := json.Unmarshal(ch.Vector, &vec); err != nil {
			continue
		}
		sim := cosine(qvec, vec)
		if sim > 0.001 {
			results = append(results, scored{ch, sim})
		}
	}

	sort.Slice(results, func(i, j int) bool { return results[i].sim > results[j].sim })
	if len(results) > topK {
		results = results[:topK]
	}

	out := make([]RetrievalResult, 0, len(results))
	for _, r := range results {
		out = append(out, RetrievalResult{
			ArticleID: r.ch.ArticleID,
			Title:     s.titles[r.ch.ArticleID],
			Content:   r.ch.Content,
			Score:     r.sim,
		})
	}
	return out
}
