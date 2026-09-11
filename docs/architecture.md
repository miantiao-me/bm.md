# 架构设计

本文档介绍 bm.md 的系统设计、核心流程与工程架构。

---

## 技术架构总览

bm.md 是一个纯前端优先、支持边缘与 Node.js 部署的 Markdown 排版与转换系统。系统向外提供三类平行的功能入口，全部由底层的统一工具注册表（Tool Registry）驱动：

1. **Web 交互界面**：基于 TanStack Start + React 19 构建的高性能单页/同构应用。
2. **命令行界面（CLI）**：通过 `cac` 封装为轻量命令行工具 `bmmd`，支持管道流与文件处理。
3. **服务化接口（REST API / MCP）**：基于 oRPC 提供类型安全的 RESTful API（搭配 OpenAPI/Scalar 文档）与面向 AI Agent 的 Model Context Protocol 端点。

```
┌─────────────────────────────────────────────────────────────┐
│                       三大使用入口                           │
│     Web 应用 (浏览器)  │   CLI (bmmd)   │  REST API / MCP    │
└───────────────┬─────────────────┬───────────────┬───────────┘
                │                 │               │
┌───────────────▼─────────────────▼───────────────▼───────────┐
│              唯一 Tool Registry (definitions.ts)             │
│        集中声明 Zod Schema、CLI 旗标、元数据与执行逻辑        │
├─────────────────┬───────────────┬───────────────┬───────────┤
│     render      │     parse     │    extract    │   lint    │
└────────┬────────┴───────┬───────┴───────┬───────┴─────┬─────┘
         │                │               │             │
┌────────▼────────────────▼───────────────▼─────────────▼─────┐
│                       核心处理引擎                           │
│   Unified (Remark/Rehype) │ AnyDoc WASM │ Takumi PDF WASM   │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术栈与依赖选型

| 领域               | 选型                                        | 作用与说明                                                |
| :----------------- | :------------------------------------------ | :-------------------------------------------------------- |
| **应用框架**       | TanStack Start (React 19 + TanStack Router) | 同构路由、服务端轻量加载与强类型客户端导航                |
| **构建与打包**     | Vite 8 + Rolldown/Babel (React Compiler)    | 现代 ESM 极速构建，编译期自动执行 React 依赖优化          |
| **样式与组件**     | Tailwind CSS 4 + shadcn/ui                  | 现代原子化 CSS；无障碍底层原语使用 `@base-ui/react`       |
| **语言与类型**     | TypeScript (`strict: true`)                 | 全链路严格类型检查与推导                                  |
| **参数与数据校验** | Zod                                         | 统一校验 API、CLI 选项与存储数据边界                      |
| **状态管理**       | Zustand                                     | 细粒度、非侵入式的模块化状态管理                          |
| **本地持久化**     | IndexedDB (`idb`) + Storage 信号            | 事务化本地文件库与跨标签页低开销通知                      |
| **测试框架**       | Vitest (`fake-indexeddb`)                   | 单元测试、集成测试与离线存储模拟                          |
| **部署运行时**     | Nitro                                       | 跨运行时适配（Cloudflare Workers, ESA, EdgeOne, Node 等） |

### 关键依赖说明

- `mcp-config`：通过 GitHub 依赖保留。项目在 MCP 配置生成面板中依赖其 `getClients`、`transformConfig` 与 `mcp-config/src/index.js`，当前 npm 公开发行版本不包含对应导出。
- `takumi-pdf` 与 `@takumi-rs/helpers`：作为统一升级组维护，负责浏览器端 WASM 驱动的 A4 矢量 PDF 排版。

---

## 代码目录组织

```
src/
├── cli/                 # bmmd 命令行封装（基于 cac 与 registry 派生）
├── components/          # React 组件体系
│   ├── command-palette/ # 全局命令面板
│   ├── dialog/          # 弹窗容器（关于、样式画廊、设置等）
│   ├── file-tabs/       # 顶部多文件标签栏与生命周期管理
│   ├── logo/            # 矢量与点阵字体 Logo
│   ├── markdown/        # 核心编辑与预览组件
│   │   ├── editor/      # CodeMirror 6 编辑器
│   │   ├── previewer/   # 基于 iframe 沙箱的实时预览视窗
│   │   ├── footer-bar/  # 底部操作栏（左侧编辑、右侧排版与导出）
│   │   └── hooks/       # 编辑与预览共享 Hooks
│   ├── mockups/         # 设备模拟框（iPhone / Safari）
│   ├── not-found/       # 404 容错视图
│   └── ui/              # shadcn/ui 基础控件（由 CLI 统一维护）
├── config/              # 应用常数、命令面板菜单项与 OpenAPI 元信息
├── env/                 # 集中环境变量访问器（规避未经校验的 process.env）
├── hooks/               # 全局通用 Hooks
├── icons/               # 定制化矢量图标
├── lib/                 # 核心通用库与处理引擎
│   ├── actions/         # 用户导出、复制与格式化动作
│   ├── document/        # AnyDoc WASM 多格式文档解析 Worker 与协议
│   ├── pdf/             # Takumi PDF WASM 分页排版 Worker、字体加载与快照
│   ├── file-storage.ts  # IndexedDB v2 事务化文件存储事实源
│   ├── file-importer.ts # 多格式文档导入、分类与标签初始化
│   ├── upload-image.ts  # 图片上传客户端边界
│   └── markdown/        # 核心 Markdown 处理中枢
│       ├── definitions.ts # 唯一 Tool Registry（render / parse / extract / lint）
│       ├── render/      # Markdown → HTML（Unified 管道、平台适配、样式内联）
│       ├── parse/       # HTML → Markdown（逆向转换与清理）
│       ├── extract/     # Markdown → 纯文本提取
│       ├── lint/        # markdownlint 规范校验与自动修复
│       ├── api.ts       # OpenAPI 请求转发适配器
│       ├── router.ts    # oRPC 路由定义
│       ├── mcp.ts       # MCP 工具注册与协议格式化
│       └── worker.ts    # Markdown Web Worker 通信入口
├── router.tsx           # TanStack Router 实例初始化
├── routes/              # TanStack Router 约定文件路由
├── storage/             # 云端图床抽象（S3 与 DC 图床自动切换）
├── stores/              # Zustand 状态切片
├── styles.css           # Tailwind CSS 4 基础样式入口
├── styles/              # 细滚动条等局部样式
├── themes/              # 样式与主题中心
│   ├── code-theme/      # 14 款代码高亮主题
│   ├── codemirror/      # CodeMirror 编辑器主题
│   ├── infographic-theme/ # Infographic 信息图主题与调色板
│   ├── markdown-style/  # 16 款核心排版样式表与元数据
│   ├── mermaid-theme/   # Mermaid 图表主题
│   ├── palette/         # OKLCH 色板映射
│   └── shadcn/          # Ayu Light / Ayu Mirage 语义化变量映射
└── utils/               # 基础通用函数
```

---

## 核心设计与数据流

### 1. 唯一 Tool Registry 架构

为杜绝 CLI、REST API、MCP 及 Worker 之间因独立维护而产生参数漂移，系统在 `src/lib/markdown/definitions.ts` 中通过 `markdownTools` 集中定义所有工具：

- **完备元数据**：每个工具声明包含名称、标题、多语言描述、输入/输出 Zod Schema、CLI 旗标规则（选项别名、布尔开关、校验规则）以及惰性载入的 `run` 执行函数。
- **自动派生机制**：
  - **CLI (`src/cli/`)**：直接读取 registry，自动生成 `cac` 命令树、选项绑定及帮助文档，使用相同 Zod Schema 进行预校验。
  - **REST API (`src/lib/markdown/router.ts`)**：遍历 registry 生成 oRPC Procedure，并派生出标准的 OpenAPI 规范。
  - **MCP 服务 (`src/lib/markdown/mcp.ts`)**：遍历 registry 向 Model Context Protocol 注册可调用 Tool。
  - **Worker (`src/lib/markdown/worker.ts`)**：在独立工作线程中暴露相同的 Procedure 集合，额外附加内部 `preview` 逻辑。

### 2. Markdown 渲染管道

Markdown 转换为最终内联 HTML 的全流程如下：

1. **语法解析**：使用 `remark-parse` 将 Markdown 文本构建为 MDAST 语法树。
2. **语法扩展**：
   - 挂载 GFM（表格、任务列表、删除线、自动链接）。
   - 解析 Math 公式语法，提取行内与块级公式。
   - 解析 YAML 与 TOML Frontmatter，将其转换为结构化数据表格。
3. **AST 转换**：通过 `remark-rehype` 将 Markdown AST 降维为 HTML HAST。
4. **特性增强**：
   - 为外部链接附加安全属性。
   - 识别 GitHub Alert 语法并注入提示块结构。
   - 通过 KaTeX 服务端/Worker 静态渲染数学公式。
   - 代码块通过 highlight.js 执行语法高亮。
   - Mermaid 代码块由 `beautiful-mermaid` 渲染为 SVG，并执行安全标签清理。
   - Infographic 代码块由 `@antv/infographic` SSR 引擎转换为 SVG 卡片。
5. **平台差异化适配**：
   - 通用 HTML：保持标准语义化标签。
   - 微信公众号：将正文外链自动转为文末脚注索引；为代码行中的连续空格注入 `\u00A0` 防止被富文本编辑器合并；为宽表格封装横向滑动容器。
6. **结构整形**：对块级容器内的游离文本节点封装 `<span>`，避免样式内联时行间距坍塌。
7. **CSS 样式内联**：调用 `juice`，将对应排版样式、代码主题与用户自定义 CSS 完全内联到每个 DOM 元素的 `style` 属性中，确保粘贴到第三方编辑器后排版分毫不差。

---

## 离线 Worker 与多引擎协作

为了保证复杂排版与大文件转换不阻断主线程 UI，系统将耗时计算完全拆分至独立的 Web Worker 中：

```
┌─────────────────────────────────────────────────────────────┐
│                         主线程 (UI)                          │
│        用户交互 / CodeMirror 编辑 / 状态响应 / iframe 挂载    │
└───────┬──────────────────────┬──────────────────────┬───────┘
        │                      │                      │
        │ oRPC 通信            │ Transferable 字节    │ WASM 转换
        │                      │                      │
┌───────▼───────────┐  ┌───────▼───────────┐  ┌───────▼───────────┐
│  Markdown Worker  │  │  Takumi PDF Worker│  │  Document Worker  │
│                   │  │                   │  │                   │
│ • Remark / Rehype │  │ • Takumi WASM 引擎│  │ • AnyDoc WASM 引擎│
│ • 代码高亮/KaTeX  │  │ • Noto 字体按需下载│  │ • Office 格式转换 │
│ • Juice 样式内联  │  │ • A4 矢量分页排版 │  │ • PDF / EPUB 转换 │
│ • 增量 preview   │  │ • 缺字检测与降级   │  │ • 串行排队与限流  │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Takumi 矢量 PDF 导出机制

PDF 导出直接以当前预览 iframe 的实际视觉呈现为蓝本，避免重跑 Markdown 造成排版不一致：

1. **DOM 快照提取**：主线程克隆 iframe 内部 DOM，移除潜在脚本，提取首个不透明背景色，并对样式表中不支持的溢出规则做安全转换。
2. **外链图片预取**：并发抓取所有 `<img>` 资源字节并转换为 ArrayBuffer（受单图 20MiB、总量 64MiB 阈值约束）。
3. **零拷贝通信**：主线程通过 Transferable 对象将图片 ArrayBuffer 的所有权无锁转移至 Takumi PDF Worker。
4. **动态字体分片**：Worker 依据正文所需字形，按需向 Google Fonts 镜像拉取 Noto 系列中日韩与 Emoji 字体切片并持久化到 Cache Storage。
5. **缺字与降级处理**：若遇到字体无法覆盖的特殊冷僻字符，优先回退替换为 `□` 占位；若环境不支持 WASM 或网络完全离线且无字体缓存，系统自动降级调起浏览器原生打印流程。

### AnyDoc 多格式文档转换

Word、PPT、Excel、PDF 等外部文件通过独立 Document Worker 加载 AnyDoc WASM 引擎。为了防止多文件连续导入引发内存溢出，客户端采用**严格串行队列**提交转换任务，并在文件进入 Worker 前执行 20MB 硬性大小校验。

---

## 状态管理与持久化分层

应用使用 Zustand 划分出 4 个职责独立的 Store，采用分级持久化机制：

```
┌──────────────────┬────────────────────────────────────────────────────────┐
│ Store            │ 职责与持久化策略                                        |
├──────────────────┼────────────────────────────────────────────────────────┤
│ filesStore       │ • 负责文件元数据目录 (catalog) 与文档正文               │
│                  │ • 事务化存储于 IndexedDB (bm.md v2)                    │
│                  │ • 活动文件 ID 存入 sessionStorage (多标签隔离)          │
│                  │ • 跨标签同步仅依靠 localStorage 发送失效信号            │
├──────────────────┼────────────────────────────────────────────────────────┤
│ editorStore      │ • 负责换行规则 (breaks)、脚注转换等编辑器配置          │
│                  │ • 持久化于 localStorage (bm.md.editor)                  │
│                  │ • 客户端挂载时显式触发 rehydrate                       │
├──────────────────┼────────────────────────────────────────────────────────┤
│ previewStore     │ • 负责当前选中的排版样式、代码主题、设备模式与自定义 CSS│
│                  │ • 持久化于 localStorage (bm.md.preview)                 │
│                  │ • 客户端挂载时显式触发 rehydrate                       │
├──────────────────┼────────────────────────────────────────────────────────┤
│ commandPaletteStore│ 负责全局命令面板开关与子菜单层级，纯内存状态，不持久化 │
└──────────────────┴────────────────────────────────────────────────────────┘
```

### IndexedDB v2 事务模型设计

- **原子提交**：文件新建、重命名、删除操作，均在同一事务中读取最新 catalog 并更新正文 ObjectStore，防止元数据与正文出现孤立提交。
- **并发与版本安全**：保存正文前先确认 catalog 中文档依然存在，随后递增正文独立 `version`，杜绝文件被删除后迟到的自动保存重新“复活”文件。
- **防抖保存**：连续键盘输入合并在 150ms 尾随窗口内提交，切换文件或浏览器失焦时立即强行 flush。

---

## 图片存储分流体系

系统提供无感切换的双层图床架构，客户端通过统一边界 `src/lib/upload-image.ts` 调用 `/api/upload/image`：

```
客户端请求 (FormData: file + name)
         │
         ▼
服务端 api.upload.image.ts
├── 1. 请求体尺寸校验 (Content-Length ≤ 6MB, 文件 ≤ 5MB)
└── 2. 魔数文件签名校验 (严格判定 PNG / JPEG / GIF / WebP，拦截 SVG 与伪造扩展名)
         │
         ▼
存储分流器 (src/storage/index.ts)
├── S3 凭据齐全 (S3_ENDPOINT, KEY_ID, SECRET_KEY) ──► S3Storage (R2 / MinIO / AWS)
└── 凭据不全或缺失 ─────────────────────────────────► DCStorage (默认公共图床)
```

---

## 跨环境部署与构建检测

项目依赖 Nitro 实现自适应边缘部署，`scripts/vite/platform.ts` 集中识别平台特征：

1. **阿里云 ESA**：
   - 触发条件：环境变量中检测到 `AliUid`。
   - 行为：自动启用 `./preset/aliyun-esa/nitro.config.ts` 预设，构建期执行路由预渲染（`/`、`/about`、`/docs/*`），并将 PWA 产物定向输出至 `dist/client`。
2. **腾讯云 EdgeOne**：
   - 触发条件：`std-env` 识别出 `edgeone_pages`，或检测到 `EDGEONE_PROJECT_ID` / `EO_MAKERS`。
   - 行为：启用官方 `edgeone-pages` 预设，禁用不兼容的构建期预渲染，PWA 资源直接定向输出至 `.edgeone/assets`。
3. **通用平台**：未命中特定厂商变量时，交由 Nitro 自动侦测（支持 Cloudflare Workers、Vercel、Netlify 及标准 Node 容器化运行）。
