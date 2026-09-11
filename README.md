# bm.md

[![持续集成](https://img.shields.io/github/actions/workflow/status/miantiao-me/bm.md/ci.yml?branch=master&style=flat&logo=github)](https://github.com/miantiao-me/bm.md/actions/workflows/ci.yml) [![npm 版本](https://img.shields.io/npm/v/bmmd?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/bmmd) [![许可证](https://img.shields.io/github/license/miantiao-me/bm.md?style=flat)](https://github.com/miantiao-me/bm.md/blob/master/LICENSE) [![TanStack Start](https://img.shields.io/badge/TanStack%20Start-React-FF4154?style=flat&logo=tanstack&logoColor=white)](https://tanstack.com/start/latest) [![shadcn/ui](https://img.shields.io/badge/shadcn-ui-000000?style=flat&logo=shadcnui&logoColor=white)](https://ui.shadcn.com/)

Markdown 排版工具，专为微信公众号与多平台排版设计，支持富文本复制、图片生成与矢量 PDF 导出。

---

## ✨ 核心特性

- **专门适配微信排版**：一键复制带内联样式的富文本，自动处理链接转脚注、代码块空格保护及移动端表格横向滚动；同时支持复制通用 HTML。
- **丰富的样式系统**：内置 16 款经过细致调校的 Markdown 排版样式（涵盖经典纸质、现代报章、终端、学术等风格）与 14 款代码高亮主题，支持追加自定义 CSS。
- **图表与信息图集成**：支持 Mermaid 流程图与 AntV Infographic 信息图，渲染产物自动进行安全清理并无缝内嵌。
- **多样化导出能力**：基于 snapDOM 生成 PNG/JPEG 图片；集成 Takumi PDF WASM 引擎，直接在浏览器端按 A4 规范分页排版并导出矢量 PDF，支持字体子集下载与缺字降级。
- **多文件与格式导入**：基于 IndexedDB 实现多标签页事务化持久存储；支持直接打开 Markdown，并借助 AnyDoc WASM 引擎将 Word、PowerPoint、Excel、PDF、RTF、EPUB、CSV 及 HTML 文档转换为 Markdown。
- **三位一体的能力入口**：除 Web 交互界面外，所有 Markdown 处理能力均通过统一 Registry 派生为命令行工具（CLI）、REST API 与 MCP（Model Context Protocol）服务。

## 🚀 快速开始

### 环境要求

- 本地开发、构建和应用部署使用 Node.js 24（见 `.node-version`）；npm 发布的 CLI 支持 Node.js >= 20。
- Node.js 20 已结束维护，建议 CLI 用户也使用 Node.js 24。
- pnpm 11.26.0

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/miantiao-me/bm.md.git
cd bm.md

# 安装依赖
pnpm install

# 启动本地开发服务（默认端口 2663）
pnpm dev
```

启动后在浏览器中访问 `http://localhost:2663`。

生产构建与本地预览：

```bash
pnpm build
pnpm preview
```

### 环境变量

环境变量均为可选配置，具体可参考 `.env.example`：

- `VITE_APP_URL`、`VITE_API_URL`：客户端访问的应用基地址与 API 地址。
- `ANALYTICS_SCRIPT_URL`、`ANALYTICS_SITE_ID`：统计分析脚本配置（服务端注入）。
- `S3_ENDPOINT`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`：三者齐备时启用 S3 兼容对象存储；配合 `S3_BUCKET`、`S3_REGION`、`S3_PUBLIC_BASE_URL` 指定存储桶与公开访问域名。
- `DC_UPLOAD_URL`：可选的 DC 图床上传地址。在 S3 未配置或信息不全时自动回退至该图床服务。

## 💻 命令行工具（CLI）

项目核心处理能力已封装为独立命令行工具 `bmmd`，支持文件输入与标准管道（stdin/stdout）。

```bash
# 全局安装
pnpm add -g bmmd

# 或无需安装直接通过 dlx 运行
pnpm dlx bmmd render article.md --platform wechat --output article.html

# 管道输入与提取纯文本
cat article.md | bmmd extract

# 按照 markdownlint 规则修复并写回原文件
bmmd lint article.md --fix
```

本地开发时，可通过 `pnpm build:cli` 构建命令行产物，输出路径为 `bin/bmmd.mjs`。

## 🛠️ 技术栈与部署

- **前端框架**：[TanStack Start](https://tanstack.com/start)（React 19 + TanStack Router）
- **构建工具**：[Vite 8](https://vite.dev)
- **视觉样式**：[Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)（基础原语基于 `@base-ui/react`，设计系统基于 Ayu Light / Ayu Mirage）
- **部署驱动**：[Nitro](https://nitro.build)，支持主流云服务商与边缘运行时

### 阿里云 ESA 部署

构建系统检测到环境变量 `AliUid` 时会自动启用 ESA 适配，预渲染常用页面并将资源输出到 `dist/client`：

```txt
安装命令: pnpm install
构建命令: pnpm run build
根目录: /
静态资源目录: dist/client
函数文件路径: dist/server/server.js
```

### 腾讯云 EdgeOne 部署

构建系统检测到 `edgeone_pages` 或相关环境变量时自动适配 EdgeOne：

```txt
框架预设: Other
根目录: ./
输出目录: .edgeone
编译命令: pnpm run build
安装命令: pnpm install
```

其他部署环境配置请参考 [Nitro 官方文档](https://nitro.build/deploy)。

## 📖 深入文档

- [功能特性详述](https://github.com/miantiao-me/bm.md/blob/master/docs/features.md)：多文件管理、编辑器特性、排版样式、多格式转换与导出细节。
- [技术架构设计](https://github.com/miantiao-me/bm.md/blob/master/docs/architecture.md)：系统分层、Registry 派生、状态持久化、Worker 通信与离线 PDF 排版机制。
- [UI 设计系统](https://github.com/miantiao-me/bm.md/blob/master/docs/design.md)：高密度设计哲学、Ayu 配色体系、无障碍对比度考量与组件规范。
- [前端工程准则](https://github.com/miantiao-me/bm.md/blob/master/docs/ui-skill.md)：界面组件、交互与动效约束。
- [REST API 文档](https://bm.md/docs)：由 Scalar 驱动的 OpenAPI 在线文档。

## 🙏 致谢

- [Kami](https://github.com/tw93/Kami)：默认排版样式「Kami」的设计灵感来源。

## 📄 许可证

本项目开源许可证为 [LGPL-3.0](LICENSE)。
