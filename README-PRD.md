# 📖 Web 漫画库项目需求文档 (PRD)

## 1. 项目概述

本项目是一个前后端一体的本地 Web 漫画阅览器。核心目标是通过 Web 界面浏览和管理本地以 `.zip` 格式存储的漫画。

* **后端技术栈**: Bun + ElysiaJS + Drizzle ORM (SQLite)
* **前端技术栈**: Vite + React + Tailwind CSS
* **核心业务逻辑**: 后端读取并解析 SQLite 中的数据，针对 `zip` 漫画文件进行流式动态解压读取；前端负责漫画列表展示、高级检索、以及高性能的漫画阅读器（Reader）。

---

## 2. 核心功能与页面设计 (基于现有表结构)

### 📌 页面一：漫画主页 / 库浏览器 (Library Browser)

用户进入系统后的主界面，以网格（Grid）卡片形式瀑布流展示漫画。

* **数据映射与展示**:
* **封面图**: 使用 `coverPath` 或 `coverHash` 缓存。后端需提供一个接口：`/api/comics/:id/cover`，根据 `coverPath` 返回图片。
* **漫画卡片信息**: 优先显示 `title`，若有则可切换显示 `title_jpn`（日文原名）。展示 `category`（分类）、`pageCount`（页数）和 `rating`（评分）。
* **状态角标**: 根据 `status`（如：已完结、连载中）和 `mark`（标记）在卡片右上角显示不同样式的标签。
* **隐藏处理**: 默认过滤掉 `hiddenBook = 1` 或 `exist = 0`（本地文件已不存在）的漫画。



### 📌 页面二：高级搜索与过滤栏 (Search & Filter)

利用现有数据库字段，提供多维度的筛选功能：

* **文本搜索**: 支持对 `title`、`title_jpn`、`tags` 进行模糊搜索。
* **分类筛选**: 基于 `category` 字段的下拉单选/多选。
* **标签云过滤**: `tags` 字段为 JSON 类型。前端需支持解析 JSON 数组/对象，允许用户点击标签进行联动筛选。
* **排序功能 (Sort)**:
* 按入库时间排序 (`createdAt` / `posted`)
* 按最后更新排序 (`updatedAt` / `mtime`)
* 按评分排序 (`rating`)
* 按阅读次数排序 (`readCount`)
* 按文件大小排序 (`filesize` / `bundleSize`)



### 📌 页面三：漫画详情页 (Manga Details)

点击卡片后进入的弹窗或新页面，展示漫画的全部元数据。

* **元数据面板**: 展示作者（可通过 `tags` 或 `category` 延伸，或展示完整 JSON 里的元数据）、文件大小（格式化 `filesize`）、页数 (`pageCount`)。
* **互动与记录功能 (重点)**:
* **评分组件**: 星星评分器，允许用户修改评分，修改后前端调用 API 更新数据库的 `rating` 字段。
* **阅读历史**: 展示 `readCount`（阅读次数）。每次用户打开阅读器时，后端将该漫画的 `readCount` 自动 `+1`。
* **书签/隐藏**: 提供快捷按钮修改 `mark`（收藏）和 `hiddenBook`（隐藏状态）。



### 📌 页面四：高性能漫画阅读器 (Manga Reader) - **项目核心**

由于漫画真实文件是本地的 `zip` 包（对应 `filepath`），阅读器需具备以下特性：

* **核心加载逻辑**:
* 前端通过接口 `/api/comics/:id/page/:pageNumber` 向后端请求单张图片。
* 后端根据 `filepath` 打开 ZIP 文件，定位到对应序号（`pageNumber`）的图片文件，将其转换为 Buffer 以图片流形式返回。**绝对不在本地解压出实体文件**。


* **前端交互 (Tailwind + React 状态)**:
* **两种阅读模式**:
1. **单页/双页模式**: 左右点击或键盘方向键翻页（适合 PC 端）。
2. **长条下滚模式 (Webtoon)**: 所有图片按顺序垂直排列，利用懒加载（Lazy Load）随滚动条动态加载（适合手机、平板端）。


* **进度保存**: 结合前端 `localStorage` 或扩展数据库表，记录用户当前读到了第几页，下次打开时自动跳转。



---

## 3. 关键 API 接口设计 (供 ElysiaJS 后端实现)

为了让 Eden Treaty 完美推导类型，要求所有接口定义好输入/输出校验。

| 接口路径 | 请求方法 | 功能描述 | 核心关联数据库字段 |
| --- | --- | --- | --- |
| `/api/mangas` | GET | 分页获取漫画列表（带搜索、过滤、排序参数） | `title`, `category`, `tags`, `rating`, `hiddenBook` |
| `/api/mangas/:id` | GET | 获取单部漫画的详细元数据 | 全部字段 |
| `/api/mangas/:id/cover` | GET | 获取漫画封面图片流 | `coverPath` |
| `/api/mangas/:id/page/:index` | GET | 动态读取并返回 ZIP 内第 index 页的图片流 | `filepath`, `pageCount` |
| `/api/mangas/:id/rate` | POST | 更新用户对该漫画的评分 | `rating`, `updatedAt` |
| `/api/mangas/:id/meta` | PATCH | 更新阅读次数、标记或隐藏状态 | `readCount`, `mark`, `hiddenBook` |

---

## 4. 给 AI (Cursor / Claude Code) 的开发指令提示词 (Prompt 模板)

当你准备好让 AI 开始写代码时，可以直接抛出以下具体的指令：

### 💡 任务 1：创建数据库 Drizzle Schema

> **提示词：** “根据 PRD 文档中的 `Mangas` 表结构，在后端使用 Drizzle ORM 定义对应的 SQLite Schema。注意 `tags` 字段是 JSON 类型，`createdAt` 和 `updatedAt` 为日期类型。请生成对应的 schema.ts 文件。”

### 💡 任务 2：编写后端 ZIP 动态读取逻辑

> **提示词：** “请在 Bun + ElysiaJS 环境下，写一个核心路由 `/api/mangas/:id/page/:index`。逻辑是：根据 ID 查出数据库中的 `filepath`，使用 `adm-zip` 或 Bun 原生能力打开该 `.zip` 文件，按文件名排序或索引获取第 `:index` 张图片，并以 `image/jpeg` 或 `image/png` 的 Response 流返回给前端，不要解压到本地硬盘。”

### 💡 任务 3：使用 Tailwind + React 写阅读器组件

> **提示词：** “请用 React + Tailwind CSS 帮我写一个高级漫画阅读器组件 `ComicReader.tsx`。它需要支持两种模式：点击左右翻页模式、以及垂直无限滚动（长漫）模式。图片地址统一调用后端的流接口。请确保界面在深色模式下有良好的视觉体验，并加入预加载下一页图片的功能以保证流畅度。”