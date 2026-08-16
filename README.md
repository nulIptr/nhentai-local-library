# 📚 nhentai-local-library

> 本地 Web 漫画库 —— 管理 `nhentai-helper` 下载的漫画，支持标签分析，并在浏览器中直接阅读。

一个前后端一体的本地 Web 漫画阅览器。核心目标是通过 Web 界面浏览和管理本地以 `.zip` / `.cbz` 格式存储的漫画，并深度利用 nhentai 的标签元数据做可视化分析。

> ⚠️ **非官方项目**：本项目与 nhentai 官方无关，仅用于管理你自己通过 [nhentai-helper](https://github.com/Tsuk1ko/nhentai-helper) 下载的本地文件。

---

## ✨ 功能特性

### 📖 高性能漫画阅读器（核心）
- **三种阅读模式**：单页、双页、长条滚动（Webtoon）
- **流式读取**：后端按需从 ZIP 中动态解压单张图片返回，**绝不落盘解压**
- **多种适配**：适应窗口 / 宽度 / 高度
- **进度保存**：自动记录阅读进度，下次打开自动跳转
- **阅读页直接评分**：0.5 星步进，乐观更新

### 🏷️ 标签分析（特色）
- **标签云**：字号按出现次数映射，支持命名空间筛选与搜索
- **柱状图**：Top 20/50/100 标签排行
- **热力图**：Top 标签共现矩阵
- **作者排行**：Top 作者统计
- **命名空间分布**：环形图展示各命名空间标签数量
- **翻译覆盖**：基于 [EhTagTranslation](https://github.com/EhTagTranslation/DatabaseReleases) 元数据库，展示译名、说明与链接
- **元数据自动刷新**：定时从 GitHub Release 拉取并校验标签数据库

### 🔍 图书馆浏览
- **网格瀑布流**：封面卡片展示
- **高级搜索**：标题 / 日文原名 / 标签模糊搜索
- **多维筛选**：分类、标签（支持 `namespace:tag` 精确匹配）、隐藏项
- **多种排序**：入库时间、更新时间、评分、阅读次数、文件大小、页数
- **随机漫游**：随机推荐
- **评分 / 收藏 / 隐藏**：完整互动记录

### ⚙️ 库管理
- **自动扫描**：启动时后台扫描 `LIBRARY_PATH` 目录
- **增量 / 强制扫描**：普通扫描只处理新增文件，强制扫描全量校验并清理已删除记录
- **封面缓存**：自动提取并缓存封面，清理孤儿封面
- **删除漫画**：同时删除本地文件与数据库记录

---

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| 后端 | [Bun](https://bun.sh) + [ElysiaJS](https://elysiajs.com) |
| 数据库 | [Drizzle ORM](https://orm.drizzle.team) + SQLite |
| 前端 | [React 19](https://react.dev) + [Vite](https://vite.dev) + [Tailwind CSS](https://tailwindcss.com) |
| 数据请求 | [TanStack Query](https://tanstack.com/query) + [Eden](https://elysiajs.com/eden) |
| 图表 | [Recharts](https://recharts.org) |
| 路由 | [wouter](https://github.com/molefrog/wouter) |
| 状态 | [Zustand](https://zustand-demo.pmnd.rs) |

---

## 🚀 快速开始

### 环境要求
- [Bun](https://bun.sh) ≥ 1.x

### 安装
```bash
bun install
```

### 配置环境变量
复制 `.env.example` 为 `.env` 并填写：

```env
PORT=3000
DB_PATH=./database.sqlite
# 指向 nhentai-helper 下载的漫画目录（zip/cbz）
LIBRARY_PATH=/path/to/your/manga/library

# 标签元数据自动刷新（可选）
TAG_METADATA_AUTO_REFRESH=true
TAG_METADATA_REFRESH_HOURS=24
TAG_METADATA_URL=https://github.com/EhTagTranslation/DatabaseReleases/raw/master/db.html.json
```

### 开发
```bash
bun run dev
```
- 前端：`http://localhost:5173`（Vite 代理 `/api` 到后端）
- 后端：`http://localhost:3000`

### 生产构建
```bash
bun run start
```
该命令会依次执行数据库迁移、前端构建，并启动后端服务（同时托管 `dist/` 构建产物）。

### 测试
```bash
bun test
```

---

## 📁 项目结构

```
├── src/
│   ├── server/            # 后端
│   │   ├── index.ts       # Elysia 入口，SPA 托管 + 自动扫描
│   │   ├── schema.ts      # Drizzle SQLite Schema
│   │   ├── db.ts          # 数据库连接
│   │   ├── routes/        # API 路由
│   │   │   ├── mangas.ts  # 漫画 CRUD / 阅读 / 评分 / 封面 / 分页
│   │   │   └── tags.ts    # 标签分析 / 元数据状态 / 刷新
│   │   ├── lib/           # 核心逻辑
│   │   │   ├── zip.ts     # ZIP 流式读取 + info.json 解析
│   │   │   ├── scan.ts    # 库扫描
│   │   │   ├── cover.ts   # 封面读取
│   │   │   ├── tags.ts    # 标签元数据索引
│   │   │   ├── tag-analysis.ts  # 标签聚合分析
│   │   │   ├── metadata-refresh.ts  # 元数据自动刷新
│   │   │   └── html.ts    # HTML 清理 / 链接提取
│   │   └── metadata/      # 标签元数据库（gitignore）
│   ├── pages/             # 前端页面
│   │   ├── Library.tsx    # 图书馆
│   │   ├── Reader.tsx     # 阅读器
│   │   ├── Tags.tsx       # 标签分析
│   │   └── Settings.tsx   # 设置
│   ├── components/        # 前端组件
│   ├── stores/            # Zustand 状态
│   └── types.ts           # 共享类型
├── prompts/              # AI 编程 prompt 文档
├── drizzle/              # 数据库迁移
└── data/covers/          # 封面缓存（gitignore）
```

---

## 🔌 API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/mangas/list` | 分页列表（搜索 / 过滤 / 排序） |
| GET | `/api/mangas/random` | 随机漫画 |
| GET | `/api/mangas/categories` | 分类列表 |
| GET | `/api/mangas/:id` | 漫画详情 |
| GET | `/api/mangas/:id/tags` | 漫画标签（含译名 / 说明） |
| GET | `/api/mangas/:id/cover` | 封面图片流 |
| GET | `/api/mangas/:id/page/:index` | 指定页图片流 |
| POST | `/api/mangas/:id/read` | 阅读计数 +1 |
| POST | `/api/mangas/:id/rate` | 评分（0–5） |
| PATCH | `/api/mangas/:id/meta` | 更新标记 / 隐藏 / 进度 |
| DELETE | `/api/mangas/:id` | 删除漫画（含文件） |
| POST | `/api/mangas/scan` | 触发库扫描 |
| GET | `/api/tags/analysis` | 标签分析（排行 / 共现 / 命名空间） |
| GET | `/api/tags/metadata/status` | 元数据库状态 |
| POST | `/api/tags/metadata/refresh` | 手动刷新元数据库 |

---

## 📄 License

[MIT](./LICENSE)
