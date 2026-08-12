import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Home, BookOpen, BarChart3, LogOut } from 'lucide-react'
import { ArticleReader } from '../components/ArticleReader'
import { AuthForm } from '../components/AuthForm'
import { Loading } from '../components/Loading'
import { Article } from '../types'
import { getTodayArticle, markArticleComplete, logout } from '../services/storageService'
import { useProgress } from '../contexts/ProgressContext'
import { MOTIVATIONAL_QUOTES } from '../constants'
import api from '../lib/api'

export default function HomePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { progress, refreshProgress } = useProgress()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token) {
      setLoading(false)
      return
    }

    setIsAuthenticated(true)

    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.name || '')
        setUserRole(user.role || '')
      } catch (e) {
        console.error(e)
      }
    }

    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      if (id) {
        // 获取指定ID的文章
        const res = await api.get(`/articles/${id}`)
        if (res.ok) {
          const data = await res.json()
          const articleData = data.data || data
          // 解析content字段
          if (typeof articleData.content === 'string') {
            try {
              articleData.content = JSON.parse(articleData.content)
            } catch {
              articleData.content = []
            }
          }
          setArticle(articleData)
        }
      } else {
        // 获取今日文章
        const todayArticle = await getTodayArticle()
        if (todayArticle) {
          setArticle(todayArticle)
        }
      }
    } catch (error) {
      console.error('获取数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteArticle = async () => {
    if (!article) return

    const { newBadges } = await markArticleComplete(article)

    // 刷新进度数据
    await refreshProgress()

    // 显示激励语
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
    setToastMessage(quote)

    if (newBadges.length > 0) {
      setTimeout(() => {
        setToastMessage(`解锁徽章: ${newBadges.join(', ')}!`)
      }, 3000)
    }

    setTimeout(() => setToastMessage(null), 5000)
  }

  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
    window.location.reload()
  }

  if (loading) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <AuthForm />
  }

  if (!article) {
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
              className="font-semibold text-primary-600"
            >
              今日阅读
            </button>
            <button
              onClick={() => navigate('/library')}
              className="font-medium text-slate-500 hover:text-primary-600 transition"
            >
              文章库
            </button>
            <button
              onClick={() => navigate('/stats')}
              className="font-medium text-slate-500 hover:text-primary-600 transition"
            >
              统计
            </button>

            {/* 管理员链接 */}
            {userRole === 'admin' && (
              <a
                href="/admin"
                className="font-medium text-accent-600 hover:text-accent-700 transition"
              >
                管理后台
              </a>
            )}

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600">
                {userName}
              </span>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition"
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端顶部栏 */}
      <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-primary-100 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-display font-bold text-primary-600 text-lg">
            <BookOpen size={20} /> 每日英语
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">
              {userName}
            </span>
            <button onClick={handleLogout} className="text-slate-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 pt-6 md:pt-10">
        <ArticleReader
          article={article}
          isCompleted={progress?.completedArticleIds?.includes(article.id) || false}
          onComplete={handleCompleteArticle}
        />
      </main>

      {/* 移动端底部导航栏 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary-100 shadow-lg z-40 pb-safe">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-primary-600"
          >
            <Home size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-semibold">阅读</span>
          </button>
          <button
            onClick={() => navigate('/library')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400"
          >
            <BookOpen size={24} strokeWidth={2} />
            <span className="text-[10px] font-medium">文章库</span>
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

      {/* Toast通知 */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white px-6 py-3 rounded-full shadow-clay-hover flex items-center gap-3 text-sm font-medium">
            <span>✨</span> {toastMessage}
          </div>
        </div>
      )}
    </div>
  )
}
