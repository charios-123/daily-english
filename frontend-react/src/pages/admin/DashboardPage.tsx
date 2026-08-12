import { useEffect, useState } from 'react'
import { Users, FileText, Shield, UserPlus } from 'lucide-react'
import api from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'

interface DashboardData {
  totalUsers: number
  totalArticles: number
  adminCount: number
  newUsers7Days: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      if (res.ok) {
        const result = await res.json()
        setData(result.data)
      }
    } catch (e) {
      console.error('获取仪表盘数据失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: '总用户数',
      value: data?.totalUsers || 0,
      icon: Users,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      label: '总文章数',
      value: data?.totalArticles || 0,
      icon: FileText,
      color: 'from-teal-500 to-primary-500',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600'
    },
    {
      label: '管理员数',
      value: data?.adminCount || 0,
      icon: Shield,
      color: 'from-primary-500 to-teal-400',
      bgColor: 'bg-primary-50',
      textColor: 'text-primary-600'
    },
    {
      label: '近7天新用户',
      value: data?.newUsers7Days || 0,
      icon: UserPlus,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ]

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-800 mb-6">仪表盘</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon
              return (
                <div
                  key={index}
                  className="clay-card p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${card.bgColor} rounded-claySm flex items-center justify-center`}>
                      <Icon size={24} className={card.textColor} />
                    </div>
                  </div>
                  <div className="text-3xl font-display font-bold text-slate-800 mb-1">
                    {card.value}
                  </div>
                  <div className="text-sm text-slate-500">
                    {card.label}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
