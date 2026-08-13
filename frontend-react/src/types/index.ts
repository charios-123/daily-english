export interface Article {
  id: number
  date: string
  titleEn: string
  titleZh: string
  summaryEn: string
  summaryZh: string
  content: ContentBlock[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  durationSeconds?: number
  audioUrl?: string
  wordBoundaries?: WordBoundaryInfo[]
}

// 词级时间戳（edge-tts WordBoundary，秒）
export interface WordBoundaryInfo {
  word: string
  offset: number
  duration: number
}

export interface ContentBlock {
  en: string
  zh: string
}

export interface UserProgress {
  completedArticleIds: number[]
  totalDaysLearned: number
  totalArticlesCompleted: number
  currentStreak: number
  longestStreak: number
  beginnerCount: number
  intermediateCount: number
  advancedCount: number
  lastCompletedDate: string | null
  activityLog: Record<string, number>
  badges: string[]
}

export interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
}
