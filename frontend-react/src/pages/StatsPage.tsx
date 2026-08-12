import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, BookOpen, BarChart3, Flame, Calendar, Target } from 'lucide-react'
import { Loading } from '../components/Loading'
import { useProgress } from '../contexts/ProgressContext'
import { BADGE_DEFINITIONS } from '../constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StatsPage() {
  const navigate = useNavigate()
  const { progress, loading } = useProgress()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/')
    } else {
      setIsAuthenticated(true)
    }
  }, [navigate])

  if (loading || !isAuthenticated) {
    return <Loading />
  }

  if (!progress) {
    return <Loading />
  }

  // 准备图表数据
  const chartData = [
    { name: '初级', count: progress.beginnerCount, fill: '#22c55e' },
    { name: '中级', count: progress.intermediateCount, fill: '#eab308' },
    { name: '高级', count: progress.advancedCount, fill: '#ef4444' },
  ]

  // 生成热度图数据（最近365天）
  const generateHeatmapData = () => {
    const data: { date: string; count: number }[] = []
    const today = new Date()

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = progress.activityLog[dateStr] || 0
      data.push({ date: dateStr, count })
    }

    return data
  }

  const heatmapData = generateHeatmapData()

  // 计算热度图的颜色
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-primary-50'
    if (count === 1) return 'bg-primary-200'
    if (count === 2) return 'bg-primary-400'
    if (count >= 3) return 'bg-primary-600'
    return 'bg-primary-800'
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
              className="font-medium text-slate-500 hover:text-primary-600 transition"
            >
              文章库
            </button>
            <button
              onClick={() => navigate('/stats')}
              className="font-semibold text-primary-600"
            >
              统计
            </button>
          </div>
        </div>
      </nav>

      {/* 移动端顶部栏 */}
      <div className="md:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-primary-100 px-4 py-3">
        <h1 className="font-display font-bold text-lg text-slate-800">学习统计</h1>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        <h1 className="text-2xl font-display font-bold text-slate-800 mb-6 hidden md:block">学习统计</h1>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="clay-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              <span className="text-sm text-slate-500">学习天数</span>
            </div>
            <p className="text-2xl font-display font-bold text-slate-800">{progress.totalDaysLearned}</p>
          </div>

          <div className="clay-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <span className="text-sm text-slate-500">完成文章</span>
            </div>
            <p className="text-2xl font-display font-bold text-slate-800">{progress.totalArticlesCompleted}</p>
          </div>

          <div className="clay-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-accent-500" />
              <span className="text-sm text-slate-500">当前连续</span>
            </div>
            <p className="text-2xl font-display font-bold text-accent-600">{progress.currentStreak} 天</p>
          </div>

          <div className="clay-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-slate-500">最长连续</span>
            </div>
            <p className="text-2xl font-display font-bold text-slate-800">{progress.longestStreak} 天</p>
          </div>
        </div>

        {/* 学习热度图 */}
        <div className="clay-card p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-slate-800 mb-4">学习热度图</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-[700px]">
              {heatmapData.map((day, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count)}`}
                  title={`${day.date}: ${day.count} 篇`}
                />
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary-50"></div>
                <span>0 篇</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary-200"></div>
                <span>1 篇</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary-400"></div>
                <span>2 篇</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary-600"></div>
                <span>3+ 篇</span>
              </div>
            </div>
          </div>
        </div>

        {/* 难度分布图表 */}
        <div className="clay-card p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-slate-800 mb-4">难度分布</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccfbf1" />
                <XAxis dataKey="name" tick={{ fontFamily: 'Nunito' }} />
                <YAxis tick={{ fontFamily: 'Nunito' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 成就徽章 */}
        <div className="clay-card p-6 mb-8">
          <h2 className="text-lg font-display font-bold text-slate-800 mb-4">成就徽章</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(BADGE_DEFINITIONS).map(([key, badge]) => {
              const isUnlocked = progress.badges.includes(key)

              return (
                <div
                  key={key}
                  className={`p-4 rounded-clay text-center transition-all duration-200 ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-accent-50 to-yellow-50 border border-accent-200 shadow-clay'
                      : 'bg-white/60 border border-primary-100 opacity-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <h3 className="font-display font-bold text-sm text-slate-800">{badge.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                  {isUnlocked && (
                    <span className="inline-block mt-2 text-xs text-accent-600 font-semibold">✓ 已解锁</span>
                  )}
                </div>
              )
            })}
          </div>
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
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400"
          >
            <BookOpen size={24} strokeWidth={2} />
            <span className="text-[10px] font-medium">文章库</span>
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-primary-600"
          >
            <BarChart3 size={24} strokeWidth={2.5} />
            <span className="text-[10px] font-semibold">统计</span>
          </button>
        </div>
      </div>
    </div>
  )
}
