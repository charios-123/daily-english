<div align="center">

# 📖 Daily English Reader · 每日英语阅读

一个帮助你通过**每日精读英文文章**提升英语水平的全栈应用。

前后端分离架构：**Golang (Gin + GORM) 后端** + **React (TypeScript) 前端**，集成 AI 知识点分析、TTS 语音合成与游戏化学习激励。

</div>

---

## ✨ 功能特性

- **每日文章推荐**：按日期推送今日文章，支持中英对照 / 纯英文 / 纯中文三种阅读模式
- **音频跟读**：一键生成文章 TTS 音频（Edge-TTS），基于**词级时间戳**（wordBoundary）做精确对齐，播放时逐词高亮 + **卡拉OK式渐变填充**，自动滚动
- **AI 知识点分析**：按文章 RAG 检索切片作上下文，调用 DeepSeek 提取生词、短语、语法、句型，带缓存与规则降级兜底
- **AI 知识问答**：基于**全局 RAG 知识库**（文章切块 + 词频向量 + 余弦相似度检索）回答问题，附带引用来源，零外部向量数据库依赖
- **游戏化激励**：成就徽章（首次阅读 / 连续 3 天 / 阅读 10 篇 / 高级学习者）、连续天数统计、学习热度图
- **学习数据统计**：学习天数、完成文章数、当前/最长连续天数、难度分布图表
- **管理后台**：文章 CRUD、用户管理、数据仪表盘（管理员专属）
- **优雅降级**：数据库不可用时文章接口自动返回本地兜底数据，AI 不可用时返回规则分析结果，保证核心体验不中断

---

## 🛠 技术栈

| 端 | 技术 |
|---|---|
| 后端 | Go 1.26 · Gin v1.12 · GORM v1.31 · golang-jwt/v5 · bcrypt · godotenv · cos-go-sdk-v5 |
| 存储 | MySQL（GORM 自动迁移）· 腾讯云 COS（音频文件，预签名 URL） |
| AI | DeepSeek API（OpenAI 兼容，Bearer 鉴权）· Edge-TTS（语音合成）· 轻量 RAG（词频向量 + 余弦相似度） |
| 前端 | React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · React Router 6 |
| 前端库 | lucide-react（图标）· recharts（图表）· react-markdown（AI 结果渲染） |
| 设计系统 | Claymorphism 风格 · teal 主色 · Fredoka / Nunito 字体（ui-ux-pro-max skill 生成） |

---

## 🏗 项目架构

```
┌─────────────────┐        HTTP / JSON         ┌──────────────────┐
│  frontend-react │ ──────── /api ───────────▶ │   backend-go     │
│  React + Vite   │ ◀────────────────────────── │  Gin + GORM      │
└─────────────────┘        统一响应 {code,data,msg}   │   :8081          │
                                          └────┬─────────┬─────────┘
                                               │         │
                                        MySQL 数据库   腾讯云 COS
                                          │              │
                                        (不可用时       Edge-TTS
                                        文章接口降级兜底)   DeepSeek
```

### 目录结构

```
daily-english-reader
├── backend-go/                  # Go 后端（Gin + GORM）
│   ├── cmd/                     # 可执行程序入口
│   │   ├── server/
│   │   │   └── main.go          # 服务入口：启动、DB 初始化、seedAdmin
│   │   └── seed/
│   │       └── main.go          # 文章数据种子脚本
│   ├── internal/                # 私有业务包
│   │   ├── router/              # 路由层：服务装配 + 路由注册 + CORS
│   │   ├── config/              # 环境变量配置（密钥从 .env 读取）
│   │   ├── database/            # GORM 连接与自动迁移（逐表迁移，失败不阻塞）
│   │   ├── models/              # GORM 模型（User / Article / UserProgress / KnowledgeChunk）
│   │   ├── dto/                 # 请求/响应结构（兼容前端分页字段）
│   │   ├── utils/               # 统一响应 Result、JWT 工具
│   │   ├── middleware/          # JWT 认证 / 管理员 / 数据库可用性中间件
│   │   ├── handlers/            # 各接口处理器（auth/article/progress/ai/tts/cos/admin/health）
│   │   └── services/            # 业务逻辑（AI / RAG / COS / TTS / 进度徽章）
│   ├── scripts/                 # Node 脚本（Edge-TTS 语音合成 + 词级时间戳采集）
│   └── .env                     # 密钥配置（已被 .gitignore 排除，不提交）
├── frontend-react/              # React 前端（Vite + Tailwind）
│   ├── src/
│   │   ├── pages/               # HomePage / LibraryPage / StatsPage / admin/*
│   │   ├── components/          # ArticleReader / AudioPlayer / AiAnalysis / AuthForm ...
│   │   ├── contexts/            # ProgressContext（全局学习进度）
│   │   ├── services/            # storageService（API 调用与数据解析）
│   │   ├── lib/                 # fetch 封装（Bearer Token）
│   │   └── types/               # 前端类型定义
│   └── vite.config.ts           # 代理 /api → http://localhost:8081
└── design-system/               # ui-ux-pro-max 设计系统文档
```

---

## 🚀 快速开始

### 前置要求

- **Go 1.26+**（后端）
- **Node.js 18+**（前端 + TTS 脚本）
- **MySQL 5.7+**（可选，无数据库时后端自动降级运行）

### 1. 配置环境变量

复制示例到 `backend-go/.env`（文件已被 `.gitignore` 排除，不会提交到仓库）：

```bash
# backend-go/.env
# MySQL 数据库
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=daily_english

# JWT 密钥（生产环境务必修改）
JWT_SECRET=your-strong-secret-at-least-32-bytes

# 腾讯云 COS（音频文件存储）
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-guangzhou
COS_BUCKET=your-bucket-name

# DeepSeek（AI 知识点分析）
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 2. 启动后端（:8081）

```bash
cd backend-go
cd scripts && npm install && cd ..   # 安装 Edge-TTS 脚本依赖（scripts/ 下）
go mod tidy                          # 拉取 Go 依赖
go run ./cmd/server                  # 启动服务
```

启动后会自动：
- 连接 MySQL 并执行 GORM 自动迁移（失败不阻塞，文章接口降级）
- 创建默认管理员账号 `admin@example.com / admin123`

### 3. 启动前端（:5173）

```bash
cd frontend-react
npm install
npm run dev
```

浏览器访问 http://localhost:5173 ，Vite 已将 `/api` 代理到 `http://localhost:8081`。

---

## 📡 API 概览

统一响应格式：`{ "code": 200, "data": ..., "msg": "success" }`

| 模块 | 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|---|
| 认证 | POST | `/api/auth/login` | 登录（bcrypt 校验 + JWT） | 公开 |
| 认证 | POST | `/api/auth/register` | 注册 | 公开 |
| 认证 | GET | `/api/auth/session` | 获取当前用户 | Bearer |
| 文章 | GET | `/api/articles?page=&size=` | 文章列表（分页） | 公开 |
| 文章 | GET | `/api/articles/today` | 今日文章 | 公开 |
| 文章 | GET | `/api/articles/:id` | 文章详情 | 公开 |
| 进度 | GET | `/api/progress` | 获取学习进度 | Bearer |
| 进度 | POST | `/api/progress/complete` | 标记完成（返回新徽章） | Bearer |
| AI | POST | `/api/ai/analyze` | 知识点分析（按文章 RAG 切片 + DeepSeek + 降级） | Bearer |
| AI | POST | `/api/ai/ask` | RAG 知识问答（全局检索 + DeepSeek 生成） | Bearer |
| TTS | POST | `/api/tts/generate` | 生成音频（Edge-TTS → COS） | Bearer |
| COS | GET | `/api/cos/credentials` | 上传凭证 | Bearer |
| COS | POST | `/api/cos/upload` | 上传文件 | Bearer |
| 管理 | / | `/api/admin/**` | 文章/用户/仪表盘 | Bearer + Admin |

分页响应兼容 MyBatis-Plus `IPage` 字段：`records / total / size / current / pages`。

---

## 🧠 核心设计

### 1. 认证与授权
- 密码使用 **bcrypt** 加密存储；登录成功签发 **JWT（HS256）**，前端以 `Authorization: Bearer <token>` 携带
- 中间件链：`AuthMiddleware`（校验 JWT）→ `AdminMiddleware`（校验角色）→ `DBRequiredMiddleware`（数据库不可用时返回 503）

### 2. 降级兜底策略
- **数据库不可用**：文章列表/详情/今日接口自动返回内置静态文章数据，阅读核心链路不受影响
- **AI 不可用**：DeepSeek 调用失败或超时（30s）时，按关键词/词缀/句式规则生成基础知识点分析；结果按文章缓存，避免重复请求

### 3. 音频-文本对齐（词级精确对齐）
- Edge-TTS 开启 `wordBoundaryEnabled` 词级边界事件，返回每个单词的起始偏移与朗读时长（单位 100ns）
- 后端通过**归一化贪心匹配算法**（小写 + 去标点）将原文单词与 TTS 边界词对齐，生成词级时间戳
- 前端按时间戳驱动高亮，采用**卡拉OK式渐变填充**实现平滑过渡，容器自动滚动跟随

### 4. RAG 知识库（轻量实现，零向量数据库依赖）
- 文章按段落切块入库（`knowledge_chunks` 表，内容为「英文 + 中文释义」），向量采用**英文词频 + 中文字符频率**混合编码，支持中英混合查询
- 检索用**余弦相似度**对切片全量比对 + 排序取 topK（启动时全量载入内存，量级小性能足够）
- **双粒度检索**：`Retrieve` 全局跨文章检索 → AI 问答；`RetrieveByArticle` 按 `article_id` 过滤 → 知识点分析，避免上下文串扰
- 统一 AI 管道：检索 → prompt 组装 → DeepSeek 生成 → 规则降级，知识点分析与问答共用

### 5. 游戏化
- 完成文章时由服务端计算徽章（`first_article` / `streak_3` / `articles_10` / `advanced_master`）与连续天数
- 学习活动记录在 `UserProgress.activity_log`（JSON），前端据此渲染 GitHub 风格热度图

---

## ☁️ 部署

- **前端构建**：`cd frontend-react && npm run build`，产物在 `dist/`，可部署到 Nginx/静态托管
- **后端**：`cd backend-go && go build -o server ./cmd/server` 生成单文件二进制，配合系统服务（systemd/NSSM）运行
- **反向代理**：Nginx 将 `/` 指向前端、`/api` 代理到 `http://localhost:8081`

> ⚠️ 安全提醒：`.env`、`node_modules/`、`dist/` 均已加入 `.gitignore`，请勿将任何密钥提交到仓库。

---

## 📄 License

MIT
