import React, { useState, useRef, useCallback } from 'react'
import { Article, WordBoundaryInfo } from '../types'
import { DIFFICULTY_LABELS } from '../constants'
import { CheckCircle2, Calendar, Trophy, Volume2, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AiAnalysis } from './AiAnalysis'
import { AudioPlayer } from './AudioPlayer'
import api from '../lib/api'

interface ArticleReaderProps {
  article: Article
  isCompleted: boolean
  onComplete: () => void
}

type ViewMode = 'en' | 'zh' | 'bilingual'

interface WordBoundary {
  time: number
  energy: number
}

interface WordTiming {
  word: string
  startTime: number
  endTime: number
  paragraphIndex: number
  wordIndex: number
}

// 归一化单词：小写 + 去除非字母数字字符
const normalizeWord = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

// 将 edge-tts 词级时间戳对齐到文章单词
// edge-tts 的 WordBoundary 词序与文本一致，采用顺序贪心匹配；
// 缩写（如 I'm → I + 'm）合并匹配；匹配不上的词用相邻边界插值兜底
function alignToWordBoundaries(
  allWords: { word: string; paragraphIndex: number; wordIndex: number }[],
  boundaries: WordBoundaryInfo[]
): WordTiming[] {
  const timings: WordTiming[] = []
  let bIdx = 0

  for (const w of allWords) {
    const target = normalizeWord(w.word)
    let start = 0
    let end = 0
    let matched = false

    while (bIdx < boundaries.length && !matched) {
      const single = normalizeWord(boundaries[bIdx].word)
      if (single === target) {
        start = boundaries[bIdx].offset
        end = start + boundaries[bIdx].duration
        matched = true
        bIdx++
        break
      }
      // 尝试合并下一个边界（处理 TTS 拆分缩写）
      if (bIdx + 1 < boundaries.length) {
        const merged = single + normalizeWord(boundaries[bIdx + 1].word)
        if (merged === target) {
          start = boundaries[bIdx].offset
          end = boundaries[bIdx + 1].offset + boundaries[bIdx + 1].duration
          matched = true
          bIdx += 2
          break
        }
      }
      bIdx++
    }

    if (!matched) {
      // 边界耗尽：用前一个词结束后插值
      const last = timings[timings.length - 1]
      start = last ? last.endTime + 0.08 : 0
      end = start + 0.3
    }

    timings.push({
      word: w.word,
      startTime: start,
      endTime: end,
      paragraphIndex: w.paragraphIndex,
      wordIndex: w.wordIndex,
    })
  }

  return timings
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({ article, isCompleted, onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('en')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioUrl, setAudioUrl] = useState(article.audioUrl)
  const [highlightedParagraph, setHighlightedParagraph] = useState<number>(-1)
  const [highlightedWord, setHighlightedWord] = useState<{ paragraph: number; word: number }>({ paragraph: -1, word: -1 })

  // 段落引用
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([])

  // 存储音频分析得到的单词边界
  const wordBoundariesRef = useRef<WordBoundary[]>([])

  // edge-tts 精确词级时间戳（优先使用）
  const [wordBoundaries, setWordBoundaries] = useState<WordBoundaryInfo[]>(article.wordBoundaries || [])

  // 计算每个单词的时间位置（基于音频分析或估算）
  const wordTimings = React.useMemo(() => {
    if (!article.content || article.content.length === 0) return []

    // 收集所有单词
    const allWords: { word: string; paragraphIndex: number; wordIndex: number }[] = []
    article.content.forEach((block, paragraphIndex) => {
      const words = block.en.split(/\s+/).filter(w => w.length > 0)
      words.forEach((word, wordIndex) => {
        allWords.push({ word, paragraphIndex, wordIndex })
      })
    })

    if (allWords.length === 0) return []

    // 优先使用 edge-tts 精确词级时间戳（词与时间精确对应）
    if (wordBoundaries.length > 0) {
      return alignToWordBoundaries(allWords, wordBoundaries)
    }

    // 如果有音频分析的边界数据，使用它
    const boundaries = wordBoundariesRef.current
    if (boundaries.length > 0) {
      // 将边界映射到单词
      const timings: WordTiming[] = []
      const totalWords = allWords.length
      const totalBoundaries = boundaries.length

      // 使用更精确的映射：根据边界数量和单词数量的比例
      if (totalBoundaries >= totalWords) {
        // 边界数量 >= 单词数量，直接映射
        for (let i = 0; i < totalWords; i++) {
          const startTime = boundaries[i].time
          const endTime = i < totalWords - 1 ? boundaries[i + 1].time : boundaries[i].time + 0.5

          timings.push({
            word: allWords[i].word,
            startTime,
            endTime,
            paragraphIndex: allWords[i].paragraphIndex,
            wordIndex: allWords[i].wordIndex
          })
        }
      } else {
        // 边界数量 < 单词数量，均匀分配
        for (let i = 0; i < totalWords; i++) {
          const boundaryIndex = Math.floor(i * totalBoundaries / totalWords)
          const nextBoundaryIndex = Math.min(boundaryIndex + 1, totalBoundaries - 1)

          timings.push({
            word: allWords[i].word,
            startTime: boundaries[boundaryIndex].time,
            endTime: boundaries[nextBoundaryIndex].time,
            paragraphIndex: allWords[i].paragraphIndex,
            wordIndex: allWords[i].wordIndex
          })
        }
      }

      return timings
    }

    // 否则使用估算
    const estimatedDuration = article.durationSeconds || 300
    const timePerWord = estimatedDuration / allWords.length
    const timings: WordTiming[] = []
    let accumulatedTime = 0

    allWords.forEach(item => {
      timings.push({
        word: item.word,
        startTime: accumulatedTime,
        endTime: accumulatedTime + timePerWord,
        paragraphIndex: item.paragraphIndex,
        wordIndex: item.wordIndex
      })
      accumulatedTime += timePerWord
    })

    return timings
  }, [article.content, article.durationSeconds, wordBoundaries])

  // 时间戳索引：`段落-词序` → 该词的起止时间（用于填充动画时长）
  const timingMap = React.useMemo(() => {
    const map = new Map<string, WordTiming>()
    wordTimings.forEach(t => map.set(`${t.paragraphIndex}-${t.wordIndex}`, t))
    return map
  }, [wordTimings])

  // 处理音频分析得到的单词边界
  const handleWordBoundaries = useCallback((boundaries: WordBoundary[]) => {
    wordBoundariesRef.current = boundaries
    console.log(`检测到 ${boundaries.length} 个单词边界`)
  }, [])

  // 处理音频时间更新
  const handleTimeUpdate = useCallback((currentTime: number, _duration: number) => {
    if (wordTimings.length === 0) return

    // 查找当前应该高亮的单词
    const activeWordIndex = wordTimings.findIndex(
      timing => currentTime >= timing.startTime && currentTime < timing.endTime
    )

    if (activeWordIndex !== -1) {
      const activeWord = wordTimings[activeWordIndex]
      setHighlightedWord({ paragraph: activeWord.paragraphIndex, word: activeWord.wordIndex })

      // 如果段落变化，自动滚动
      if (activeWord.paragraphIndex !== highlightedParagraph) {
        setHighlightedParagraph(activeWord.paragraphIndex)
        const element = paragraphRefs.current[activeWord.paragraphIndex]
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          })
        }
      }
    }
  }, [wordTimings, highlightedParagraph])

  // 处理音频播放状态变化
  const handlePlayStateChange = useCallback((playing: boolean) => {
    if (!playing) {
      setHighlightedParagraph(-1)
      setHighlightedWord({ paragraph: -1, word: -1 })
    }
  }, [])

  // 渲染带高亮的文本
  const renderHighlightedText = (text: string, paragraphIndex: number) => {
    const words = text.split(/(\s+)/)
    let wordIndex = 0

    return words.map((segment, i) => {
      // 空格直接返回
      if (/^\s+$/.test(segment)) {
        return <span key={i}>{segment}</span>
      }

      // 单词
      const currentWordIndex = wordIndex
      const isHighlighted = highlightedWord.paragraph === paragraphIndex && highlightedWord.word === currentWordIndex
      const isRead = highlightedWord.paragraph === paragraphIndex && currentWordIndex < highlightedWord.word
      wordIndex++

      // 当前词的填充动画时长 = 该词实际朗读时长（平滑跟随语音）
      const timing = timingMap.get(`${paragraphIndex}-${currentWordIndex}`)
      const fillDuration = isHighlighted && timing ? Math.max(timing.endTime - timing.startTime, 0.12) : undefined

      return (
        <span
          key={i}
          className={`kf-word ${isHighlighted ? 'is-active' : isRead ? 'is-read' : ''}`}
          style={fillDuration ? ({ '--fill-duration': `${fillDuration}s` } as React.CSSProperties) : undefined}
        >
          {segment}
        </span>
      )
    })
  }

  const handleComplete = () => {
    if (!isCompleted) {
      setShowConfetti(true)
      onComplete()
      setTimeout(() => setShowConfetti(false), 3000)
    }
  }

  const handleGenerateAudio = async () => {
    setGeneratingAudio(true)
    try {
      const res = await api.post('/tts/generate', { articleId: article.id })
      const data = await res.json()
      if (res.ok && data.data) {
        setAudioUrl(data.data.audioUrl)
        if (Array.isArray(data.data.wordBoundaries) && data.data.wordBoundaries.length > 0) {
          setWordBoundaries(data.data.wordBoundaries)
        }
        alert('音频生成成功！')
      } else {
        alert(data.msg || '音频生成失败')
      }
    } catch (e) {
      console.error('生成音频失败:', e)
      alert('网络错误，请稍后再试')
    } finally {
      setGeneratingAudio(false)
    }
  }

  // Difficulty badge color map
  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-700 border-red-200',
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 animate-fade-in-down">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${difficultyColors[article.difficulty] || 'bg-slate-100 text-slate-700'}`}>
            {DIFFICULTY_LABELS[article.difficulty] || article.difficulty}
          </span>
          <span className="flex items-center text-xs text-slate-500">
            <Calendar className="w-3 h-3 mr-1" />
            {article.date}
          </span>
        </div>
        <div className="inline-flex bg-primary-50 rounded-lg p-1 shadow-sm border border-primary-100">
          <button
            onClick={() => setViewMode('en')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'en' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            English
          </button>
          <button
            onClick={() => setViewMode('zh')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'zh' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            中文
          </button>
          <button
            onClick={() => setViewMode('bilingual')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'bilingual' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            中英对照
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight mb-3">
          {(viewMode === 'en' || viewMode === 'bilingual') && <div className="mb-1">{article.titleEn}</div>}
          {(viewMode === 'zh' || viewMode === 'bilingual') && <div className={viewMode === 'bilingual' ? 'text-2xl text-slate-600' : ''}>{article.titleZh}</div>}
        </h1>

        <div className="text-lg text-slate-600 italic border-l-4 border-primary-200 bg-primary-50/50 pl-4 py-2 rounded-r-lg">
          {(viewMode === 'en' || viewMode === 'bilingual') && <p className="mb-1">{article.summaryEn}</p>}
          {(viewMode === 'zh' || viewMode === 'bilingual') && <p className={viewMode === 'bilingual' ? 'text-base text-slate-500' : ''}>{article.summaryZh}</p>}
        </div>
      </header>

      {/* AI Analysis Toggle Button & Audio Player */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`clay-btn flex items-center gap-2 px-5 py-2.5 rounded-claySm font-medium transition-all shadow-sm ${
            showAiPanel
              ? 'bg-primary-100 text-primary-700 border border-primary-200'
              : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-clay-hover'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z"/>
            <path d="M9.5 14.5 3 21"/>
            <path d="M14.5 14.5 21 21"/>
          </svg>
          {showAiPanel ? '收起 AI 分析' : 'AI 知识点分析'}
        </button>

        {!audioUrl && (
          <button
            onClick={handleGenerateAudio}
            disabled={generatingAudio}
            className="clay-btn flex items-center gap-2 px-5 py-2.5 rounded-claySm font-medium transition-all shadow-sm bg-gradient-to-r from-teal-600 to-emerald-500 text-white hover:shadow-clay-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingAudio ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Volume2 size={18} />
            )}
            {generatingAudio ? '生成中...' : '生成音频'}
          </button>
        )}

        <div className="flex-1">
          <AudioPlayer
            src={audioUrl}
            title="文章音频"
            onTimeUpdate={handleTimeUpdate}
            onPlayStateChange={handlePlayStateChange}
            onWordBoundaries={handleWordBoundaries}
            disableAnalysis={wordBoundaries.length > 0}
          />
        </div>
      </div>

      {/* Main Content: Article + AI Panel */}
      <div className="flex gap-6">
        {/* Left: Article Content */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${showAiPanel ? 'lg:w-1/2' : 'w-full'}`}>
          <article className="prose prose-slate prose-lg max-w-none text-slate-800 mb-10 leading-relaxed">
            {article.content.map((block, blockIdx) => (
              <div
                key={blockIdx}
                ref={(el) => { paragraphRefs.current[blockIdx] = el }}
                className={`mb-6 p-5 rounded-clay transition-all duration-500 ease-in-out ${
                  highlightedParagraph === blockIdx
                    ? 'bg-gradient-to-br from-primary-50 via-white to-primary-100 border-2 border-primary-200 shadow-clay-hover transform scale-[1.02]'
                    : highlightedParagraph > blockIdx
                      ? 'bg-white/60 border-2 border-primary-50'
                      : 'bg-white/70 border-2 border-transparent hover:border-primary-100'
                }`}
              >
                {(viewMode === 'en' || viewMode === 'bilingual') && (
                  <div className="mb-2 text-lg leading-relaxed">
                    {renderHighlightedText(block.en, blockIdx)}
                  </div>
                )}
                {(viewMode === 'zh' || viewMode === 'bilingual') && (
                  <div className={viewMode === 'bilingual' ? 'text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100' : ''}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.zh}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </article>

          {/* Action Footer */}
          <div className="fixed bottom-20 left-0 right-0 px-4 md:static md:px-0">
            <button
              onClick={handleComplete}
              disabled={isCompleted}
              className={`clay-btn w-full md:w-auto md:min-w-[200px] flex items-center justify-center gap-2 py-3 px-6 rounded-claySm font-bold shadow-lg transition-all transform active:scale-95 ${
                isCompleted
                  ? 'bg-primary-100 text-primary-700 cursor-default border border-primary-200'
                  : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-clay-hover'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={20} />
                  已完成
                </>
              ) : (
                <>
                  标记为已完成
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: AI Analysis Panel */}
        <div className={`hidden lg:block transition-all duration-300 ${showAiPanel ? 'w-1/2 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="sticky top-0">
            <AiAnalysis
              articleId={article.id}
              isExpanded={showAiPanel}
              onToggle={() => setShowAiPanel(!showAiPanel)}
            />
          </div>
        </div>
      </div>

      {/* Mobile AI Button */}
      <div className="lg:hidden fixed bottom-36 right-4 z-40">
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className="w-14 h-14 bg-gradient-to-r from-primary-600 to-primary-400 rounded-full shadow-clay-hover flex items-center justify-center hover:shadow-xl transition-shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z"/>
            <path d="M9.5 14.5 3 21"/>
            <path d="M14.5 14.5 21 21"/>
            <path d="M12 7v3"/>
          </svg>
        </button>
      </div>

      {/* Mobile AI Panel */}
      {showAiPanel && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">AI 知识点分析</h3>
              <button
                onClick={() => setShowAiPanel(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <AiAnalysis
                articleId={article.id}
                isExpanded={true}
                onToggle={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-clay shadow-clay-hover border border-primary-100 text-center animate-pop-in">
            <Trophy className="w-12 h-12 text-accent-500 mx-auto mb-2" />
            <h3 className="text-xl font-display font-bold text-primary-900">太棒了！</h3>
            <p className="text-slate-500">文章学习已完成。</p>
          </div>
        </div>
      )}
    </div>
  )
}
