import React, { useState } from 'react'
import { BookOpen, ArrowRight } from 'lucide-react'
import { login, register } from '../services/storageService'

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const result = await login(email, password)
        if (!result.success) {
          setError(result.error || '登录失败')
        } else {
          // 登录成功，刷新页面
          window.location.reload()
        }
      } else {
        const result = await register(email, password, name)
        if (!result.success) {
          setError(result.error || '注册失败')
        } else {
          // 注册成功，刷新页面
          window.location.reload()
        }
      }
    } catch (err: any) {
      setError(err.message || '发生错误，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="max-w-md w-full bg-white rounded-clay shadow-clay border border-primary-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-8 text-center relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-accent-400/20 rounded-full blur-lg"></div>
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm relative">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 font-display">每日英语阅读</h2>
          <p className="text-primary-100">每天进步一点点，坚持带来大改变</p>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center font-display">
            {isLogin ? '欢迎回来' : '创建新账号'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">昵称</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-claySm border border-slate-200 bg-primary-50/40 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:bg-white transition outline-none"
                  placeholder="Your Name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-claySm border border-slate-200 bg-primary-50/40 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:bg-white transition outline-none"
                placeholder="hello@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-claySm border border-slate-200 bg-primary-50/40 focus:ring-2 focus:ring-primary-400 focus:border-primary-400 focus:bg-white transition outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-claySm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="clay-btn w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 rounded-claySm font-bold hover:shadow-clay-hover flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                '处理中...'
              ) : (
                <>
                  {isLogin ? '登录' : '注册并登录'} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-sm text-slate-500 hover:text-primary-600 transition font-medium"
            >
              {isLogin ? '还没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
