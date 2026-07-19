**实施方案**

当前仓库已经具备 `TagCloud`、`StarRating`、评分 API 和基础标签翻译。`db.html.json` 包含 13 个命名空间、约 42,923 条标签，但现有生成流程只保留 `name`，丢弃了 `intro` 和 `links`。

### 1. 标签元数据服务

重构 [tags.ts](C:\open\emm-web\src\server\lib\tags.ts)，直接解析并缓存 `db.html.json`：

```ts
interface TagMetadata {
  name: string
  intro: string
  links: Array<{ label: string; url: string }>
}
```

- 建立 `namespace + tag` 索引和扁平回退索引。
- 保留 `category -> reclass` 等命名空间别名。
- 将 HTML 转换为经过白名单清理的内容，链接只允许 `https/http`。
- API 只返回请求涉及的数据，不把 7 MB 文件发送给浏览器。
- 扩展 `Manga.tagMeta` 类型，包含 `name / intro / links`。

### 2. 标签分析 API

新增独立的 `/api/tags` 路由，避免和 `/api/mangas/:id` 冲突：

- `GET /api/tags/analysis`
  - 标签总数、已标记漫画数、翻译覆盖率。
  - 各命名空间数量。
  - 标签频次排行。
  - Top N 标签共现矩阵，用于热力图。
  - 支持 `namespace`、`limit`、`includeHidden` 参数。
- `GET /api/tags/metadata/status`
  - 数据库版本、commit SHA、更新时间、文件更新时间、刷新状态。
- `POST /api/tags/metadata/refresh`
  - 手动刷新标签数据库。

统计默认只包含 `exist=true` 且未隐藏的漫画。标签按 namespace 和精确值统计，不再使用字符串模糊匹配。数据库当前约 2,165 本漫画，可先在服务端解析 tags 聚合；后续数据量显著增长时再迁移到规范化统计表。

### 3. 标签分析页面

增加 `/tags` 页面，并在图书馆顶部加入分析入口。页面采用工作台式布局：

- 顶部：标签数量、已标记漫画、翻译覆盖率、元数据库版本。
- 标签云：字号按出现次数映射，支持 namespace 筛选和搜索。
- 柱状图：Top 20/50/100 标签，可切换数量排序。
- 热力图：Top 标签共现矩阵，颜色表示共同出现的漫画数量。
- 明细表：原始名称、译名、命名空间、使用次数、说明状态。
- 点击图表标签跳转到图书馆的精确标签筛选结果。
- 完整支持加载、空数据、错误、窄屏横向滚动状态。

图表建议增加 `recharts`；热力矩阵使用 CSS Grid/Canvas 实现，避免再引入大型图表套件。

### 4. 标签说明交互

扩展 [TagCloud.tsx](C:\open\emm-web\src\components\TagCloud.tsx)：

- 标签本体显示翻译后的 `name`。
- Hover、键盘 focus 时显示浮层。
- 移动端点击可打开同一浮层。
- 浮层展示原始 tag、namespace、`name`、`intro` 和可点击的 `links`。
- 使用 Portal 避免被漫画信息弹窗的 `overflow` 裁剪。
- 浮层可交互并有关闭延迟，保证链接能够点击，而不只是原生 `title`。

该能力会同时用于漫画信息弹窗和分析页面。

### 5. 阅读页直接评分

在 [Reader.tsx](C:\open\emm-web\src\pages\Reader.tsx) 工具栏加入紧凑的 `StarRating`：

- 复用 `POST /api/mangas/:id/rate`。
- 支持 0.5 星步进。
- 使用乐观更新，失败时恢复原评分。
- 提交期间避免重复请求。
- 成功后同步 React Query 中的漫画详情和列表缓存。

### 6. 元数据库刷新

新增 `metadata-refresh.ts`：

1. 从固定 GitHub Release URL 下载到临时文件。
2. 限制响应大小并设置超时。
3. 校验 JSON、version、head、data 和每条 `name/intro/links`。
4. 校验成功后原子替换 `db.html.json`。
5. 清除标签内存索引并立即重新加载。
6. 保留最近一次成功时间和错误信息。
7. 并发刷新返回 `409`，防止重复下载。

配置建议：

```env
TAG_METADATA_AUTO_REFRESH=true
TAG_METADATA_REFRESH_HOURS=24
TAG_METADATA_URL=https://github.com/EhTagTranslation/DatabaseReleases/raw/master/db.html.json
```

服务启动时检查文件年龄，过期则后台刷新；之后按间隔定时检查。手动刷新按钮放在标签分析页的版本信息区域。

### 7. 验证与验收

- 单元测试：HTML 清理、命名空间别名、扁平回退、无效 JSON、链接协议过滤。
- 聚合测试：重复标签去重、隐藏/失效漫画过滤、共现矩阵。
- 刷新测试：下载失败不覆盖旧文件、并发锁、校验失败、缓存重载。
- 前端验证：桌面和移动端 tooltip、链接点击、图表空数据、评分失败回滚。
- 最终运行 `build`、ESLint，并检查包含大量 tag 时的分析页面性能。

建议实施顺序为：元数据加载与类型 → 分析及刷新 API → 标签说明浮层 → 分析页面 → 阅读页评分 → 测试与响应式验收。