# AGENTS.md

本文件为 bm.md 的仓库级 agent 指南；`CLAUDE.md` 是指向本文件的软链接，不要单独编辑。

## 语言

所有交流、提交信息和代码注释一律使用**简体中文**。

## 系统边界与关键入口

bm.md 是 Markdown 排版工具，同时提供三类入口：

- Web：TanStack Start + React 19 + Vite 8，经 Nitro 部署。
- CLI：`src/cli/index.ts`，由 tsdown 打包为 npm 命令 `bin/bmmd.mjs`。
- REST API / MCP Server：通过 oRPC 暴露 Markdown 能力；路由入口分别是 `src/routes/api.$.ts` 与 `src/routes/mcp.ts`。

`src/lib/markdown/definitions.ts` 中的 `markdownTools` 是 `render` / `parse` / `extract` / `lint` 的**唯一 registry**，集中绑定 schema、元信息和执行函数。CLI、REST API、MCP 均从它派生；`src/lib/markdown/api.ts` 和 `src/lib/markdown/router.ts` 分别承接 OpenAPI handler 与 oRPC 路由。Worker 只额外提供 `preview`。

新增或修改 Markdown 工具时，必须先改 registry，避免三端漂移；随后运行：

```bash
pnpm test src/lib/markdown/registry.test.ts
```

## 环境与命令

- Node.js `>=20`，仓库 `.node-version` 为 22。
- 包管理器固定为 `pnpm@11.11.0`。
- CLI 与应用共用依赖，所有依赖均放在 `devDependencies`：`pnpm add -D <package>`。

```bash
pnpm dev                    # 开发服务器，端口 2663
pnpm build                  # prebuild 自动先生成 OpenAPI，再执行 vite build
pnpm build:cli              # 打包 CLI 到 bin/
pnpm openapi:generate       # 生成 public/api/openapi.json
pnpm lint                   # ESLint 检查
pnpm lint:fix               # ESLint 自动修复
pnpm typecheck              # tsc --noEmit
pnpm doctor                 # React 变更的聚焦检查

pnpm test                                            # 全部测试
pnpm test src/lib/markdown/extract/text.test.ts      # 单文件
pnpm test --grep "keeps paragraph"                  # 按名称筛选
pnpm test --watch                                    # 监听模式

pnpm shadcn add <component>
pnpm shadcn add shimmer-button --registry @magicui
```

不要手工调换 `pnpm build` 的生成顺序：`prebuild` 保证先执行 `openapi:generate`，再执行 Vite 构建。

## 生成物与修改边界

- `src/routeTree.gen.ts` 是 TanStack Router 生成物，禁止手改；新增路由后运行 `pnpm dev` 生成。
- `src/components/ui/` 由 shadcn CLI 管理，禁止直接修改，使用 `pnpm shadcn add`。
- `public/api/openapi.json` 由 `pnpm openapi:generate` 生成，不要手工维护。
- `bin/` 是 CLI 构建产物，不作为源代码编辑。

## 环境变量与部署检测

应用代码只能通过 `src/env/index.ts` 读取环境变量，不得直接访问 `process.env` 或 `import.meta.env`：

- `VITE_*` 可在客户端与服务端使用。
- 无前缀私有变量仅通过 server getter 暴露；变量清单见 `.env.example`。

`vite.config.ts` 顶层的平台检测属于构建配置例外。修改时必须保留：

- 存在 `AliUid` 时选择阿里云 ESA preset，预渲染首页、`/about`、`/docs/*`，并将 PWA 输出切到 `dist/client`。
- EdgeOne 优先由 std-env 的 `edgeone_pages` 检测，并以非空的 `EDGEONE_PROJECT_ID` / `EO_MAKERS` 回退识别；std-env 命中时由 Nitro 自动选择 preset，回退变量命中时项目内部选择官方 `edgeone-pages` preset，用户均无需设置 `NITRO_PRESET`。因官方 Node handler 不兼容本地 prerender preview，禁用 TanStack 构建期预渲染，并将 PWA 输出到 `.edgeone/assets`。
- 其他环境交给 Nitro 自动检测；不要硬编码成单一平台。

## React 与 UI 约束

- 已启用 React Compiler；除非 profiler 证明必要，不要手动添加 `useMemo` / `useCallback`。
- 可访问交互原语使用 `@base-ui/react`；图标只用 `lucide-react`。
- 纯图标按钮必须提供 `aria-label`。
- 禁止渐变、`h-screen`（使用 `h-dvh`）和任意值 `z-[...]`（使用固定层级刻度）。
- 禁止未授权动画，也不要动画 `width` / `height` / `margin` / `padding` 等布局属性。
- 动画仅改变 `transform` / `opacity`；JS 动画用 `motion/react`，入场动画用 `tw-animate-css`。

## 状态与持久化

Zustand 持久化 key 必须以 `bm.md.` 开头，避免与已有 IndexedDB / localStorage 数据冲突。

`filesStore` 是例外，不使用 Zustand persist：文件 catalog 与正文由 `src/lib/file-storage.ts` 在 IndexedDB `bm.md` v2 中事务化管理；活动文件只写 sessionStorage；localStorage 的 `bm.md.files.signal` 仅用于跨标签失效通知。不要重新引入全量 localStorage 快照同步。

## 测试环境

Vitest 默认运行在 Node 环境，没有浏览器 DOM。DOM / Worker 相关代码需要 mock，或拆成纯函数测试；`file-storage` 测试可使用已安装的 `fake-indexeddb`。

## Cloned Dependency Source

只读依赖源码位于 `.slim/clonedeps/repos/`，仅供检查，禁止修改。

- `.slim/clonedeps/repos/tw93__Kami/` - `tw93/Kami` at `V1.12.0`; 用于参考 Kami 的设计规范、Token 与文档排版模板。
