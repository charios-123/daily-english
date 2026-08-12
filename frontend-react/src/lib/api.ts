// API 配置
const API_BASE_URL = '/api'

// 获取存储的 Token
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// 存储 Token
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token)
  }
}

// 移除 Token
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token')
  }
}

// 通用 fetch 封装
export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // 如果返回 401，清除 Token
  if (response.status === 401) {
    removeToken()
  }

  return response
}

// 便捷方法
export const api = {
  get: (endpoint: string) => apiFetch(endpoint),

  post: (endpoint: string, data: any) =>
    apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: (endpoint: string, data: any) =>
    apiFetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (endpoint: string) =>
    apiFetch(endpoint, {
      method: 'DELETE',
    }),
}

export default api
