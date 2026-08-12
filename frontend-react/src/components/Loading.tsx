import React from 'react'

export const Loading: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-r-transparent"></div>
        <p className="mt-4 text-slate-600 font-medium">加载中...</p>
      </div>
    </div>
  )
}
