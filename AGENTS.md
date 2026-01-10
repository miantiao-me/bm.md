# AGENTS.md

本文件为 AI 编程助手（Claude Code、Cursor、Copilot 等）提供项目开发指南。

## 语言

始终使用 **简体中文** 进行交流和编写代码注释。使用 `context7` 查询最新 API/文档。

## 项目概述

bm.md 是一个基于 TanStack Start 和 React 的 Markdown 排版工具，支持为微信公众号、知乎专栏、掘金、网页及图片生成个性化排版。

**技术栈**: TanStack Start (React 19) | Vite 7 | Tailwind CSS 4 + shadcn/ui | TypeScript | pnpm | Vitest

## 常用命令

```bash
pnpm dev                    # 启动开发服务器 (端口 2663)
pnpm build                  # 生成 OpenAPI + 构建生产版本
pnpm lint:fix               # 自动修复 ESLint 问题

# 测试 (Vitest)
pnpm test                                              # 运行所有测试
pnpm test src/lib/markdown/extract/text.test.ts       # 运行单个测试文件
pnpm test --grep "keeps paragraph"                    # 按测试名称过滤
pnpm test --watch                                     # 监听模式

# shadcn/ui 组件
pnpm shadcn add <component>                           # 添加 shadcn/ui 组件
pnpm shadcn add button --registry @magicui            # 使用自定义 registry
```

## 项目结构

```
src/
├── components/
│   ├── ui/          # shadcn/ui 组件 (CLI 管理，勿手动编辑)
│   └── ...          # 业务组件
├── content/         # 静态内容 (Markdown)
├── env/             # 环境变量管理 (统一入口)
├── lib/             # 核心库 (Markdown 处理、工具函数)
├── routes/          # TanStack Router 路由 (文件路由)
├── services/        # 业务服务层
├── stores/          # Zustand 状态管理
├── styles/          # 全局样式
├── themes/          # 主题配置 (代码高亮、Markdown 样式)
└── utils/           # 工具函数
```

## 代码风格

### 导入顺序

遵循 `@antfu/eslint-config` 自动排序：

```typescript
import { createRequire } from 'node:module' // 1. Node.js 内置模块
import { create } from 'zustand' // 2. 外部依赖
import { cn } from '@/lib/utils' // 3. 内部模块 (@/)
import { Fallback } from './fallback' // 4. 相对路径
```

### TypeScript

- 使用 `import type` 导入纯类型
- 接口命名 PascalCase，如 `EditorState`
- 优先接口约束，**禁用 `any`**
- 启用 `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`
- 目标 ES2022，无需 polyfills

```typescript
import type { ClassValue } from 'clsx'

interface EditorState {
  scrollRatio: number
  setScrollFromEditor: (ratio: number) => void
}
```

### React 组件

- 组件命名 PascalCase，文件命名 kebab-case
- hooks 使用 `use` 前缀
- 页面组件默认导出，工具函数具名导出
- 已启用 `babel-plugin-react-compiler` (自动 memo 优化)

### 格式化

| 规则       | 设置                                 |
| ---------- | ------------------------------------ |
| 缩进       | 2 空格                               |
| 引号       | 单引号                               |
| 分号       | 不使用                               |
| 尾随逗号   | 多行添加                             |
| 大括号风格 | Stroustrup (`else` / `catch` 独立行) |

```typescript
if (condition) {
  // ...
}
else {
  // ...
}
```

### 错误处理

- try-catch 包裹异步操作，Zod 进行输入验证
- 允许 `console.info`, `console.warn`, `console.error`

## 路由

TanStack Router 文件路由，路由文件位于 `src/routes/`。

**重要**: `src/routeTree.gen.ts` 自动生成，**勿手动编辑**。

```typescript
// API 路由示例
export const Route = createFileRoute('/api/upload/image')({
  server: {
    middleware: [corsMiddleware],
    handlers: {
      POST: async ({ request }) => Response.json({ url }),
    },
  },
})

// 页面路由示例
export const Route = createFileRoute('/_layout/')({
  component: HomePage,
})
```

## 测试

测试文件与源文件同目录，命名 `*.test.ts`。使用 Vitest。

```typescript
import { describe, expect, it } from 'vitest'
import extract from './text'

describe('markdown -> text extract', () => {
  it('keeps paragraph separation', async () => {
    const text = await extract('First.\n\nSecond.')
    expect(text).toContain('First.')
  })
})
```

## 状态管理

Zustand + 持久化。存储名称统一使用 `bm.md.` 前缀。

```typescript
export const useMarkdownStore = create<MarkdownState>()(
  persist(
    set => ({
      content: defaultMarkdown,
      setContent: content => set({ content }),
    }),
    { name: 'bm.md.markdown' },
  ),
)
```

## 环境变量

统一通过 `src/env/index.ts` 管理：

| 前缀    | 可用范围          | 示例               |
| ------- | ----------------- | ------------------ |
| `VITE_` | 客户端 + 服务端   | `VITE_APP_URL`     |
| 无前缀  | 仅服务端 (getter) | `S3_ACCESS_KEY_ID` |

```typescript
import { env } from '@/env'

// 客户端可用
const appUrl = env.VITE_APP_URL

// 仅服务端可用 (getter 惰性读取)
const s3Key = env.S3_ACCESS_KEY_ID
```

## shadcn/ui

已配置自定义 registry:

- `@magicui` - Magic UI 组件

```bash
pnpm shadcn add button                      # 默认 registry
pnpm shadcn add shimmer-button --registry @magicui
```

## 注意事项

| 禁止                           | 必须                                 |
| ------------------------------ | ------------------------------------ |
| 使用 Next.js 模式              | 提交前运行 `pnpm lint:fix`           |
| 手动修改 `src/components/ui/`  | 环境变量通过 `src/env/index.ts` 管理 |
| 引入 Lucide React 以外的图标库 | 路径别名使用 `@/` 前缀               |
| 依赖 polyfills（目标 ES2022）  | Zod 验证所有外部输入                 |
| 使用 `any` 类型                | 测试文件与源文件同目录               |
