import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, ArrowLeft, BookOpen } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { path: '/admin', label: '仪表盘', icon: LayoutDashboard },
    { path: '/admin/articles', label: '文章管理', icon: FileText },
    { path: '/admin/users', label: '用户管理', icon: Users },
  ]

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-primary-50/50">
      {/* 顶部导航栏 */}
      <header className="bg-white/90 backdrop-blur-md border-b border-primary-100 px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">返回前台</span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-primary-600" />
              <span className="font-display font-bold text-slate-800">管理后台</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 左侧导航栏 */}
        <aside className="w-64 bg-white border-r border-primary-100 min-h-[calc(100vh-57px)] p-4 hidden md:block">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-claySm transition-all ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-600 font-medium shadow-clay'
                      : 'text-slate-600 hover:bg-primary-50/50 hover:text-slate-800'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 移动端底部导航 */}
        <aside className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-primary-100 z-50">
          <nav className="flex justify-around py-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center py-2 px-4 rounded-lg ${
                    isActive(item.path) ? 'text-primary-600' : 'text-slate-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] mt-1">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
