import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, BookOpen, BarChart3, ArrowLeft } from 'lucide-react'
import { Loading } from '../components/Loading'
import { Article } from '../types'
import { getArticles } from '../services/storageService'
import { useProgress } from '../contexts/ProgressContext'
import { DIFFICULTY_LABELS } from '../constants'

export default function LibraryPage() {
  const navigate = useNavigate()
  const { progress } = useProgress()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    try {
      const data = await getArticles()
      setArticles(data)
    } catch (error) {
      console.error('获取文章失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredArticles = articles.filter(article => {
    if (filter !== 'all' && article.difficulty !== filter) return false
    if (statusFilter === 'completed' && !progress?.completedArticleIds.includes(article.id)) return false
    if (statusFilter === 'incomplete' && progress?.completedArticleIds.includes(article.id)) return false
    return true
  })

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return <Loading />
  }

  return (
    <div className="min-h-screen text-ink pb-16 md:pb-0 font-sans">
      {/* 桌面端导航栏 */}
      <nav className="hidden md:block sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-primary-100 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-primary-600 text-xl">
            <BookOpen /> 每日英语阅读
          </div>
          <div className="flex gap-8 items-center">
            <button
              onClick={() => navigate('/')}
              className="font-medium text-slate-500 hover:text-primary-600 transition"
            >
              今日阅读
            </button>
            <button
              onClick={() => navigate('/library')}
              className="font-semibold text-primary-600"
            >
              文章库
            </button>
            <button
              onClick={() => navigate('/stats')}
              className="font-medium text-slate-500 hover:text-primary-600 transition"
            >
              统计
            </button>
          </div>
        </div>
      </nav>

      {/* 移动端顶部栏 */}
      <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-primary-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-bold text-lg text-slate-800">文章库</h1>
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-display font-bold text-slate-800 mb-6 hidden md:block">文章库</h1>

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="clay-btn px-4 py-2.5 rounded-claySm border border-primary-100 bg-white text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
          >
            <option value="all">所有难度</option>
            <option value="beginner">初级</option>
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="clay-btn px-4 py-2.5 rounded-claySm border border-primary-100 bg-white text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
          >
            <option value="all">所有状态</option>
            <option value="completed">已完成</option>
            <option value="incomplete">未完成</option>
          </select>
        </div>

        {/* 文章列表 */}
        <div className="grid gap-4">
          {filteredArticles.map(article => (
            <div
              key={article.id}
              onClick={() => navigate(`/article/${article.id}`)}
              className="clay-card p-5 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${difficultyColors[article.difficulty] || 'bg-slate-100 text-slate-700'}`}>
                    {DIFFICULTY_LABELS[article.difficulty] || article.difficulty}
                  </span>
                  {progress?.completedArticleIds.includes(article.id) && (
                    <span className="text-green-600 text-xs font-semibold">✓ 已完成</span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{article.date}</span>
              </div>
              <h3 className="font-display font-bold text-slate-800 mb-1">{article.titleEn}</h3>
              <p className="text-sm text-slate-500 mb-2">{article.titleZh}</p>
              <p className="text-sm text-slate-600 line-clamp-2">{article.summaryEn}</p>
            </div>
          ))}

          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>暂无文章</p>
            </div>
          )}
        </div>
      </main>

      {/* 移动端底部导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary-100 shadow-lg z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400"
          >
            <Home size={24} strokeWidth={2} />
            <span className="text-[10px] font-medium">阅读</span>
          </button>
          <button
            onClick={() => navigate('/library')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-primary-600"
          >
            <BookOpen size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-semibold">文章库</span>
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400"
          >
            <BarChart3 size={24} strokeWidth={2} />
            <span className="text-[10px] font-medium">统计</span>
          </button>
        </div>
      </div>
    </div>
  )
}
