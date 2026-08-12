# Daily English Reader — Design System (Master)

> 基于 ui-ux-pro-max skill 生成（数据来源：products.csv #78 Language Learning App、colors.csv #43 Online Course、typography.csv #6 Playful Creative、motion.csv Subtle/Standard、styles.csv Claymorphism + Micro-interactions）

## 产品定位

- **Product type**: Language Learning App
- **关键词**: english learning, reading, education, content-first, gamification
- **技术栈**: React 18 + Vite + Tailwind CSS + lucide-react + recharts

## 风格（Style）

- **主风格**: Claymorphism（软 3D）+ Micro-interactions
- **辅助**: Flat Design（内容区）、Vibrant & Block-based（徽章/成就区）
- 圆角: 卡片 16–24px（默认 20px），按钮 12–14px
- 阴影: 双阴影（外 4px 4px 8px + 内 inset -2px -2px 8px），柔和、无硬线
- 交互反馈: hover 位移 ≤2px（y: -1）、按压缩放、过渡 150–250ms、press 200ms
- 图标: lucide-react（SVG，禁止 emoji 作图标）

## 配色（Color Palette）

来源: Online Course/E-learning — "Progress teal + achievement orange"

| Token | 值 | 用途 |
|---|---|---|
| `--color-primary` | `#0D9488` (teal-600) | 主色、按钮、链接 |
| `--color-primary-soft` | `#2DD4BF` (teal-400) | 高亮、渐变、进度条 |
| `--color-primary-deep` | `#134E4A` (teal-900) | 深色背景、页脚 |
| `--color-accent` | `#EA580C` (orange-600) | 成就徽章、连续天数、激励 |
| `--color-bg` | `#F0FDFA` (teal-50) | 页面背景 |
| `--color-surface` | `#FFFFFF` | 卡片表面 |
| `--color-text` | `#0F172A` (slate-900) | 主文本 |
| `--color-text-muted` | `#64748B` (slate-500) | 次要文本 |
| `--color-success` | `#059669` | 完成状态 |
| `--color-danger` | `#DC2626` | 错误 |

- 正文对比度 ≥ 4.5:1（WCAG AA）
- 禁止在组件中写死十六进制色值，一律走 Tailwind token

## 字体（Typography）

来源: typography.csv #6 Playful Creative（educational 场景匹配）

- **标题/展示**: `Fredoka`（圆润、友好、有活力）
- **正文**: `Nunito`（圆润易读，长文阅读舒适）
- Base 16px、正文 line-height 1.5–1.7、标题字重 500–700
- 正文最小 14px（阅读内容 ≥16px）

## 动效（Motion）

来源: motion.csv Subtle/Standard Micro-interaction

- Hover 按钮: `y: -1, opacity: 0.9`，150–200ms，`power1.out`，只动 transform/opacity
- Hover 卡片: `y: -4, scale: 1.02`，200–250ms，`power2.out`，配 boxShadow 增强
- 入场: 淡入 + y 12–24px 偏移，300–500ms，stagger ≤8 项
- 尊重 `prefers-reduced-motion`

## 反模式（Anti-Patterns）

- ✗ 动画 width/height/margin（CLS）
- ✗ 仅用 hover 传达信息（触摸设备）
- ✗ 低对比度灰色文字、灰底灰字
- ✗ emoji 当图标
- ✗ 装饰性无意义动画
- ✗ 圆角小于 12px 的卡片、硬边阴影

## 布局与响应式

- Mobile-first，断点一致，无横向滚动
- 触摸目标 ≥ 44×44px
- 内容 max-width 720px 保证阅读行宽，区块间距 24–48px

## 页面映射

| 页面 | 风格侧重 |
|---|---|
| HomePage（今日文章） | Storytelling 卡片 + 进度激励 |
| LibraryPage（文章库） | 卡片网格 + 难度色块 |
| StatsPage（统计） | Learning Analytics + 图表 |
| AuthForm（登录/注册） | Clay 卡片 + 渐变背景 |
| Admin 系列 | Flat 数据密集，主色点缀 |
