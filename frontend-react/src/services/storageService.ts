import { UserProgress, Article } from '../types'
import api, { removeToken } from '../lib/api'

// 解析文章 content 字段（数据库中是 JSON 字符串）
const parseArticle = (raw: any): Article => {
  let content = raw.content
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      content = []
    }
  }
  if (!Array.isArray(content)) {
    content = []
  }
  return { ...raw, content }
}

// 解析进度数据
const parseProgress = (raw: any): UserProgress => {
  let completedArticleIds = raw.completedArticleIds
  if (typeof completedArticleIds === 'string') {
    try { completedArticleIds = JSON.parse(completedArticleIds) } catch { completedArticleIds = [] }
  }
  let activityLog = raw.activityLog
  if (typeof activityLog === 'string') {
    try { activityLog = JSON.parse(activityLog) } catch { activityLog = {} }
  }
  let badges = raw.badges
  if (typeof badges === 'string') {
    try { badges = JSON.parse(badges) } catch { badges = [] }
  }
  return { ...raw, completedArticleIds, activityLog, badges }
}

// 获取文章列表
export const getArticles = async (): Promise<Article[]> => {
  try {
    const res = await api.get('/articles')
    if (!res.ok) throw new Error('Failed to fetch articles')
    const data = await res.json()
    let list = data.data?.records || data.data || data
    if (!Array.isArray(list)) list = []
    return list.map(parseArticle)
  } catch (e) {
    console.error(e)
    return []
  }
}

// 获取今日文章
export const getTodayArticle = async (): Promise<Article | null> => {
  try {
    const res = await api.get('/articles/today')
    if (!res.ok) throw new Error('Failed to fetch today article')
    const data = await res.json()
    const article = data.data || data
    if (!article) return null
    return parseArticle(article)
  } catch (e) {
    console.error(e)
    return null
  }
}

// 获取用户学习进度
export const getProgress = async (): Promise<UserProgress | null> => {
  try {
    const res = await api.get('/progress')
    if (!res.ok) throw new Error('Failed to fetch progress')
    const data = await res.json()
    const raw = data.data || data
    if (!raw) return null
    return parseProgress(raw)
  } catch (e) {
    console.error(e)
    return null
  }
}

// 标记文章完成
export const markArticleComplete = async (article: Article): Promise<{ progress: UserProgress | null; newBadges: string[] }> => {
  try {
    const res = await api.post('/progress/complete', {
      articleId: article.id,
    })

    if (!res.ok) throw new Error('Failed to update')
    const data = await res.json()
    const raw = data.data || data
    const progress = raw ? parseProgress(raw) : null

    // 计算新徽章（如果后端没有返回）
    return { progress, newBadges: [] }
  } catch (e) {
    console.error(e)
    return { progress: null, newBadges: [] }
  }
}

// 用户登录
export const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await api.post('/auth/login', { email, password })
    const data = await res.json()

    if (res.ok && data.data) {
      // 保存 Token
      const { setToken } = await import('../lib/api')
      setToken(data.data.token)

      // 保存用户信息
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      return { success: true }
    }

    return { success: false, error: data.msg || '登录失败' }
  } catch (e) {
    console.error(e)
    return { success: false, error: '网络错误' }
  }
}

// 用户注册
export const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await api.post('/auth/register', { email, password, name })
    const data = await res.json()

    if (res.ok && data.data) {
      // 保存 Token
      const { setToken } = await import('../lib/api')
      setToken(data.data.token)

      // 保存用户信息
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      return { success: true }
    }

    return { success: false, error: data.msg || '注册失败' }
  } catch (e) {
    console.error(e)
    return { success: false, error: '网络错误' }
  }
}

// 获取当前用户信息
export const getCurrentUser = async (): Promise<any | null> => {
  try {
    const res = await api.get('/auth/session')
    if (!res.ok) return null
    const data = await res.json()
    return data.data || null
  } catch (e) {
    return null
  }
}

// 退出登录
export const logout = (): void => {
  removeToken()
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user')
  }
}
