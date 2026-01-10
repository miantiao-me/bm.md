# 架构设计

本文档介绍 bm.md 的技术架构设计。

---

## 技术栈

| 类别     | 技术                                        |
| -------- | ------------------------------------------- |
| 框架     | TanStack Start (React 19 + TanStack Router) |
| 构建     | Vite 7                                      |
| 样式     | Tailwind CSS 4 + shadcn/ui                  |
| 语言     | TypeScript (严格模式)                       |
| 状态管理 | Zustand                                     |
| 包管理   | pnpm                                        |
| 测试     | Vitest                                      |
| 校验     | Zod                                         |

---

## 项目结构

```
src/
├── components/          # React 组件
│   ├── command-palette/ # 命令面板
│   ├── dialog/          # 弹窗组件
│   ├── logo/            # Logo 组件
│   ├── markdown/        # Markdown 编辑器与预览器
│   │   ├── editor/      # CodeMirror 编辑器
│   │   ├── previewer/   # 预览渲染器
│   │   ├── footer-bar/  # 底部操作栏
│   │   └── hooks/       # 共享 Hooks
│   ├── mockups/         # 设备模拟框（iPhone/Safari）
│   ├── not-found/       # 404 页面
│   └── ui/              # shadcn/ui 组件（CLI 管理）
├── content/             # 静态内容（默认 Markdown）
├── env/                 # 环境变量管理
├── icons/               # 自定义图标
├── lib/                 # 核心业务逻辑
│   ├── actions/         # 用户操作（导入/导出/复制）
│   └── markdown/        # Markdown 处理管道
│       ├── extract/     # 文本提取
│       ├── lint/        # 格式校验
│       ├── parse/       # HTML → Markdown
│       └── render/      # Markdown → HTML
├── routes/              # TanStack Router 路由
├── services/            # 业务服务层
├── stores/              # Zustand 状态管理
├── styles/              # 全局样式
├── themes/              # 主题配置
│   ├── code-theme/      # 代码高亮主题
│   ├── codemirror/      # 编辑器主题
│   ├── markdown-style/  # Markdown 排版样式
│   ├── palette/         # 统一调色板
│   └── shadcn/          # shadcn 主题定制
└── utils/               # 工具函数
```

---

## 核心流程

### Markdown 处理管道

基于 unified 生态系统构建，支持多种处理流程：

```
                    ┌─────────────────────────────────────────┐
                    │           Markdown 处理管道              │
                    └─────────────────────────────────────────┘
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
    ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐       ┌───────┐
    │ Parse │       │ Render│       │Extract│       │ Lint  │       │ Upload│
    │HTML→MD│       │MD→HTML│       │MD→Text│       │MD Fix │       │ Image │
    └───────┘       └───────┘       └───────┘       └───────┘       └───────┘
        │               │               │               │               │
        ▼               ▼               ▼               ▼               ▼
   rehype-remark   remark-rehype   remark-retext   markdownlint    S3 Storage
                        │
                        ▼
                ┌───────────────┐
                │  juice (CSS)  │
                │   内联样式     │
                └───────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    ┌───────┐       ┌───────┐       ┌───────┐
    │ HTML  │       │ WeChat│       │ Zhihu │
    │ 通用  │       │ 适配器│       │ 适配器│
    └───────┘       └───────┘       └───────┘
```

### 渲染流程详解

1. **解析阶段** - `remark-parse` 解析 Markdown AST
2. **扩展处理** - GFM、Math、Frontmatter 等插件
3. **转换阶段** - `remark-rehype` 转为 HTML AST
4. **增强阶段** - 外部链接、GitHub Alert、KaTeX、代码高亮
5. **平台适配** - 针对微信/知乎/掘金的特殊处理
6. **样式内联** - `juice` 将 CSS 内联到元素

### 平台适配器

针对不同平台的特殊处理逻辑：

| 平台   | 适配内容                                           |
| ------ | -------------------------------------------------- |
| WeChat | 链接转脚注、代码空格用 `\u00A0` 保护、表格滚动容器 |
| Zhihu  | 适配知乎编辑器样式规范                             |
| Juejin | 适配掘金编辑器样式规范                             |

---

## 状态管理

使用 Zustand 进行状态管理，分为 4 个独立 Store：

### Store 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Zustand Stores                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│  markdownStore  │   editorStore   │      previewStore       │
│                 │                 │                         │
│  • content      │  • scrollRatio  │  • previewWidth         │
│                 │  • scrollSource │  • userPreferredWidth   │
│                 │  • footnoteLinks│  • markdownStyle        │
│                 │  • newWindow    │  • codeTheme            │
│                 │  • scrollSync   │  • renderedHtmlMap      │
├─────────────────┴─────────────────┴─────────────────────────┤
│                   commandPaletteStore                       │
│                                                             │
│  • open (boolean)    • subMenu (enum)                       │
└─────────────────────────────────────────────────────────────┘
```

### 持久化策略

| Store               | LocalStorage Key | 持久化内容                 |
| ------------------- | ---------------- | -------------------------- |
| markdownStore       | `bm.md.markdown` | 全部内容                   |
| editorStore         | `bm.md.editor`   | 设置项（不含滚动状态）     |
| previewStore        | `bm.md.preview`  | 样式偏好（不含 HTML 缓存） |
| commandPaletteStore | -                | 不持久化                   |

### Store 交互

- `editorStore` 设置变更时，调用 `previewStore.clearRenderedHtmlCache()` 清除缓存
- 组件通过 Hooks 订阅 Store，实现响应式更新

---

## 路由设计

基于 TanStack Router 的文件路由系统：

### 页面路由

| 路径          | 文件                     | 说明                    |
| ------------- | ------------------------ | ----------------------- |
| `/`           | `_layout.index.tsx`      | 主页（编辑器 + 预览器） |
| `/about`      | `_layout.about.tsx`      | 关于页面（弹窗）        |
| `/docs`       | `docs.tsx`               | API 文档（Scalar UI）   |
| `/docs/mcp`   | `_layout.docs.mcp.tsx`   | MCP 配置说明（弹窗）    |
| `/docs/skill` | `_layout.docs.skill.tsx` | AI Skill 文档（弹窗）   |

### API 路由

| 路径                | 文件                  | 说明                 |
| ------------------- | --------------------- | -------------------- |
| `/api/*`            | `api.$.ts`            | Markdown API（oRPC） |
| `/api/upload/image` | `api.upload.image.ts` | 图片上传             |
| `/mcp`              | `mcp.ts`              | MCP 协议端点         |

### 布局结构

```
__root.tsx (HTML 文档结构、全局 Provider)
└── _layout.tsx (主布局：编辑器 | 预览器 | 底栏)
    ├── _layout.index.tsx (首页)
    ├── _layout.about.tsx (关于弹窗)
    ├── _layout.docs.mcp.tsx (MCP 弹窗)
    └── _layout.docs.skill.tsx (Skill 弹窗)
```

---

## Worker 架构

Markdown 渲染在 Web Worker 中执行，避免阻塞主线程：

```
┌──────────────┐         oRPC          ┌──────────────┐
│  Main Thread │ ◄─────────────────► │  Web Worker  │
│              │                       │              │
│  • UI 渲染   │                       │  • Markdown  │
│  • 用户交互  │                       │    处理管道  │
│  • 状态管理  │                       │  • 重计算    │
└──────────────┘                       └──────────────┘
```

### 通信方式

- 使用 oRPC 的 Web Workers Adapter
- 支持双向通信
- 类型安全的 RPC 调用

---

## 部署支持

基于 Nitro 构建，支持多种部署平台：

| 平台               | 说明                  |
| ------------------ | --------------------- |
| Cloudflare Workers | Edge Runtime          |
| Vercel             | Serverless Functions  |
| Netlify            | Serverless Functions  |
| Node.js (Docker)   | 传统服务器部署        |
| 阿里云 ESA         | Edge Runtime          |
| 腾讯云 EdgeOne     | Node.js Runtime       |
| 其他               | 任意 Nitro 支持的平台 |

### 环境检测

项目通过环境变量自动检测部署平台：

```typescript
// vite.config.ts
if (process.env.AliUid) {
  // 阿里云 ESA
  customPreset = './preset/aliyun-esa/nitro.config.ts'
}
else if (process.env.HOME === '/dev/shm/home') {
  // 腾讯云 EdgeOne
  customPreset = './preset/tencent-edgeone/nitro.config.ts'
}
```

---

## API 设计

### oRPC 架构

使用 oRPC 构建类型安全的 API：

```
┌─────────────────────────────────────────────────────────────┐
│                        oRPC Router                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│ markdown.render │ markdown.parse  │ markdown.extract/lint   │
├─────────────────┴─────────────────┴─────────────────────────┤
│                    OpenAPIHandler                           │
│                    (CORS, Error Handling)                   │
└─────────────────────────────────────────────────────────────┘
```

### MCP 集成

实现 Model Context Protocol 服务端：

```typescript
const server = new McpServer({ name, version })

server.registerTool('render', renderDefinition, handler)
server.registerTool('parse', parseDefinition, handler)
server.registerTool('extract', extractDefinition, handler)
server.registerTool('lint', lintDefinition, handler)
```

---

## 构建优化

### Vite 插件

| 插件                          | 功能              |
| ----------------------------- | ----------------- |
| `cssRawMinifyPlugin`          | CSS 原始导入压缩  |
| `htmlRawMinifyPlugin`         | HTML 原始导入压缩 |
| `markdownPlugin`              | Markdown 文件导入 |
| `tanstackStart`               | SSR 支持          |
| `babel-plugin-react-compiler` | React 编译器优化  |

### 代码分割

- 编辑器组件懒加载
- 预览器组件懒加载
- 命令面板客户端渲染
- Worker 独立 bundle
