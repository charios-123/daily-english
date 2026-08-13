import React, { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp, BookOpen, FileText, Languages, Lightbulb, MessageCircle, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import api from '../lib/api'

interface AiAnalysisProps {
  articleId: number
  isExpanded: boolean
  onToggle: () => void
}

type PanelTab = 'analysis' | 'qa'

export const AiAnalysis: React.FC<AiAnalysisProps> = ({ articleId, isExpanded, onToggle }) => {
  const [tab, setTab] = useState<PanelTab>('analysis')
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  // AI 问答状态
  const [question, setQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaResult, setQaResult] = useState<{ answer: string; sources: string[] } | null>(null)
  const [qaError, setQaError] = useState<string | null>(null)
  const [showSources, setShowSources] = useState(false)

  const handleAnalyze = async () => {
    if (hasLoaded) return
    setLoading(true)
    setError(null)

    try {
      const res = await api.post('/ai/analyze', { articleId })
      const data = await res.json()

      if (res.ok && data.data) {
        setAnalysis(data.data.analysis)
        setHasLoaded(true)
      } else {
        setError(data.msg || 'AI分析失败')
      }
    } catch (e) {
      console.error('AI分析请求失败:', e)
      setError('网络错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  // RAG 增强问答
  const handleAsk = async () => {
    const q = question.trim()
    if (!q || qaLoading) return

    setQaLoading(true)
    setQaError(null)

    try {
      const res = await api.post('/ai/ask', { question: q })
      const data = await res.json()

      if (res.ok && data.data) {
        setQaResult({ answer: data.data.answer, sources: data.data.sources || [] })
        setShowSources(false)
      } else {
        setQaError(data.msg || '问答失败')
      }
    } catch (e) {
      console.error('AI问答请求失败:', e)
      setQaError('网络错误，请稍后再试')
    } finally {
      setQaLoading(false)
    }
  }

  // 自定义Markdown渲染组件
  const markdownComponents = {
    // 标题样式
    h1: ({ children }: any) => (
      <h1 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
        <BookOpen size={18} className="text-primary-500" />
        {children}
      </h1>
    ),
    h2: ({ children }: any) => {
      // 根据标题内容添加不同图标
      let icon = <Lightbulb size={16} className="text-amber-500" />
      const text = String(children)
      if (text.includes('词汇') || text.includes('单词')) icon = <BookOpen size={16} className="text-blue-500" />
      else if (text.includes('短语') || text.includes('词组')) icon = <Languages size={16} className="text-green-500" />
      else if (text.includes('语法')) icon = <FileText size={16} className="text-primary-500" />
      else if (text.includes('句型') || text.includes('结构')) icon = <Sparkles size={16} className="text-pink-500" />

      return (
        <h2 className="text-base font-semibold text-slate-700 mt-4 mb-2 flex items-center gap-2">
          {icon}
          {children}
        </h2>
      )
    },
    h3: ({ children }: any) => (
      <h3 className="text-sm font-semibold text-slate-600 mt-3 mb-1.5">{children}</h3>
    ),
    // 段落样式
    p: ({ children }: any) => (
      <p className="text-sm text-slate-600 leading-relaxed mb-2">{children}</p>
    ),
    // 列表样式
    ul: ({ children }: any) => (
      <ul className="space-y-1.5 mb-3 ml-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="space-y-1.5 mb-3 ml-1 list-decimal">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm text-slate-600 flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0"></span>
        <span>{children}</span>
      </li>
    ),
    // 强调样式
    strong: ({ children }: any) => (
      <strong className="font-semibold text-slate-800 bg-primary-50 px-1 rounded">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-primary-600">{children}</em>
    ),
    // 代码样式
    code: ({ children, className }: any) => {
      const isInline = !className
      if (isInline) {
        return (
          <code className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded font-mono">
            {children}
          </code>
        )
      }
      return (
        <code className="text-xs bg-slate-800 text-slate-100 px-3 py-2 rounded-lg block font-mono overflow-x-auto">
          {children}
        </code>
      )
    },
    pre: ({ children }: any) => (
      <pre className="bg-slate-800 rounded-lg p-3 mb-3 overflow-x-auto">{children}</pre>
    ),
    // 分隔线
    hr: () => (
      <hr className="my-3 border-slate-200" />
    ),
    // 表格样式
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-slate-50">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100">{children}</td>
    ),
    // 引用样式
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-3 border-primary-300 pl-3 py-1 my-2 bg-primary-50 rounded-r-lg text-sm text-slate-600 italic">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className="bg-white rounded-clay border border-primary-100 shadow-clay overflow-hidden">
      {/* 头部：Tab 切换 + 收起 */}
      <div className="flex items-center bg-gradient-to-r from-primary-50 to-primary-100/60 border-b border-primary-100">
        <button
          onClick={() => {
            setTab('analysis')
            if (!isExpanded) onToggle()
            if (!hasLoaded && !loading) handleAnalyze()
          }}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
            tab === 'analysis' ? 'text-primary-700 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={14} className="text-primary-500" />
          AI 知识点分析
        </button>
        <button
          onClick={() => {
            setTab('qa')
            if (!isExpanded) onToggle()
          }}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
            tab === 'qa' ? 'text-primary-700 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <MessageCircle size={14} className="text-primary-500" />
          AI 问答
        </button>
        <div className="flex-1" />
        <button onClick={onToggle} className="p-3 text-slate-400 hover:text-slate-600" aria-label="收起">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* 内容区域 */}
      {isExpanded && (
        <div className="p-4 max-h-[calc(100vh-100px)] overflow-y-auto">
          {tab === 'analysis' && (
            <>
              {loading && (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="relative">
                    <Loader2 size={32} className="animate-spin text-primary-500" />
                    <Sparkles size={12} className="absolute -top-1 -right-1 text-accent-400 animate-pulse" />
                  </div>
                  <p className="text-slate-600 text-sm mt-3">正在分析知识点...</p>
                  <p className="text-slate-400 text-xs mt-1">AI 正在思考中，请稍候</p>
                </div>
              )}

              {error && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">😕</span>
                  </div>
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                  <button
                    onClick={() => {
                      setAnalysis('')
                      setError(null)
                      setHasLoaded(false)
                      handleAnalyze()
                    }}
                    className="clay-btn mt-3 px-4 py-1.5 bg-primary-500 text-white text-sm rounded-claySm hover:bg-primary-600 transition"
                  >
                    重试
                  </button>
                </div>
              )}

              {analysis && (
                <div className="ai-analysis-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {analysis}
                  </ReactMarkdown>
                </div>
              )}
            </>
          )}

          {tab === 'qa' && (
            <div>
              {/* 提问输入区 */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="例如：文章中提到学习英语有哪些好处？"
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-claySm focus:outline-none focus:ring-2 focus:ring-primary-300 placeholder:text-slate-400"
                />
                <button
                  onClick={handleAsk}
                  disabled={qaLoading || !question.trim()}
                  className="clay-btn flex items-center gap-1.5 px-4 py-2 rounded-claySm text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-clay-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {qaLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  提问
                </button>
              </div>

              {qaLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-slate-500 text-sm">
                  <Loader2 size={18} className="animate-spin text-primary-500" />
                  正在检索知识库并生成回答...
                </div>
              )}

              {qaError && (
                <div className="text-center py-6">
                  <p className="text-red-500 text-sm font-medium">{qaError}</p>
                </div>
              )}

              {qaResult && !qaLoading && (
                <div>
                  <div className="ai-analysis-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {qaResult.answer}
                    </ReactMarkdown>
                  </div>

                  {qaResult.sources.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <button
                        onClick={() => setShowSources(!showSources)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <FileText size={12} />
                        引用来源（{qaResult.sources.length}）
                        {showSources ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {showSources && (
                        <div className="mt-2 space-y-2">
                          {qaResult.sources.map((src, i) => (
                            <div key={i} className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                              {src}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
