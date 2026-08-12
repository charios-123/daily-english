import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { UserProgress } from '../types'
import { getProgress } from '../services/storageService'

interface ProgressContextType {
  progress: UserProgress | null
  loading: boolean
  error: string | null
  refreshProgress: () => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取进度数据
  const fetchProgress = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setProgress(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getProgress()
      setProgress(data)
    } catch (err) {
      console.error('[ProgressContext] 获取进度失败:', err)
      setError(err instanceof Error ? err.message : '获取进度失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 组件挂载时获取进度
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // 监听 storage 变化（登录/退出时）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        fetchProgress()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [fetchProgress])

  const refreshProgress = useCallback(async () => {
    await fetchProgress()
  }, [fetchProgress])

  return (
    <ProgressContext.Provider value={{ progress, loading, error, refreshProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error('useProgress 必须在 ProgressProvider 内使用')
  }
  return context
}
