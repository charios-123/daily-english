export const MOCK_ARTICLES: Article[] = [
  {
    id: 1,
    date: '2024-01-01',
    titleEn: 'The Power of Reading',
    titleZh: '阅读的力量',
    summaryEn: 'Reading is one of the most important skills we can develop.',
    summaryZh: '阅读是我们可以培养的最重要的技能之一。',
    content: [
      { en: 'Reading is a fundamental skill that opens doors to knowledge and understanding.', zh: '阅读是一项基本技能，为知识和理解打开了大门。' },
      { en: 'It helps us learn new things, expand our vocabulary, and improve our critical thinking.', zh: '它帮助我们学习新事物，扩展词汇量，并提高批判性思维能力。' },
      { en: 'Studies show that regular reading can reduce stress and improve mental health.', zh: '研究表明，定期阅读可以减轻压力并改善心理健康。' },
    ],
    difficulty: 'beginner',
    durationSeconds: 120,
  },
  {
    id: 2,
    date: '2024-01-02',
    titleEn: 'Learning a New Language',
    titleZh: '学习一门新语言',
    summaryEn: 'Learning a new language can be challenging but rewarding.',
    summaryZh: '学习一门新语言可能很有挑战性，但也很有回报。',
    content: [
      { en: 'Learning a new language opens up a world of opportunities.', zh: '学习一门新语言打开了一个充满机会的世界。' },
      { en: 'It allows you to communicate with people from different cultures and backgrounds.', zh: '它允许你与来自不同文化和背景的人交流。' },
      { en: 'Research suggests that bilingual individuals have better cognitive abilities.', zh: '研究表明，双语个体具有更好的认知能力。' },
    ],
    difficulty: 'intermediate',
    durationSeconds: 180,
  },
  {
    id: 3,
    date: '2024-01-03',
    titleEn: 'The Future of Artificial Intelligence',
    titleZh: '人工智能的未来',
    summaryEn: 'AI is transforming the way we live and work.',
    summaryZh: '人工智能正在改变我们的生活和工作方式。',
    content: [
      { en: 'Artificial intelligence is rapidly advancing and changing various industries.', zh: '人工智能正在快速发展，改变着各个行业。' },
      { en: 'From healthcare to transportation, AI is making significant impacts.', zh: '从医疗保健到交通运输，人工智能正在产生重大影响。' },
      { en: 'The ethical implications of AI development require careful consideration.', zh: '人工智能发展的伦理影响需要仔细考虑。' },
    ],
    difficulty: 'advanced',
    durationSeconds: 240,
  },
]

export const MOTIVATIONAL_QUOTES = [
  '坚持就是胜利！',
  '每天进步一点点！',
  '学无止境！',
  '知识就是力量！',
  '今日事今日毕！',
  '读书破万卷，下笔如有神！',
  '千里之行，始于足下！',
]

export const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string }> = {
  first_article: { name: '初次启程', description: '完成第一篇文章', icon: '🚀' },
  streak_3: { name: '状态火热', description: '连续学习3天', icon: '🔥' },
  articles_10: { name: '博学者', description: '完成10篇文章', icon: '📚' },
  advanced_master: { name: '阅读大师', description: '完成一篇高级文章', icon: '👑' },
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
}

import { Article } from '../types'
