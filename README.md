# bm.md

[![持续集成](https://img.shields.io/github/actions/workflow/status/miantiao-me/bm.md/ci.yml?branch=master&style=flat&logo=github)](https://github.com/miantiao-me/bm.md/actions/workflows/ci.yml) [![npm 版本](https://img.shields.io/npm/v/bmmd?style=flat&logo=npm&logoColor=white)](https://www.npmjs.com/package/bmmd) [![许可证](https://img.shields.io/github/license/miantiao-me/bm.md?style=flat)](https://github.com/miantiao-me/bm.md/blob/master/LICENSE) [![TanStack Start](https://img.shields.io/badge/TanStack%20Start-React-FF4154?style=flat&logo=tanstack&logoColor=white)](https://tanstack.com/start/latest) [![shadcn/ui](https://img.shields.io/badge/shadcn-ui-000000?style=flat&logo=shadcnui&logoColor=white)](https://ui.shadcn.com/)

更好用的 Markdown 排版助手｜微信公众号专门适配，支持输出到网页与图片。

---

## ✨ 特性

- 📝 **实时预览** - 基于 CodeMirror 6 的 Markdown 编辑器，所见即所得
- 🎨 **8 种排版样式** - 从纸张阅读到复古怀旧，满足不同场景需求
- 🌈 **14 种代码主题** - 支持浅色/深色多种代码高亮风格
- 📱 **平台适配** - 微信公众号专门适配，同时支持通用 HTML 输出
- 📊 **图表与信息图** - 支持 Mermaid 与 AntV Infographic
- 🖼️ **图片导出** - 下载 JPEG 或复制 PNG 图片
- 📄 **PDF 与打印** - 支持高质量分页 PDF 导出和直接打印
- 📥 **文档导入** - 支持 Markdown、HTML，以及常见 Office、OpenDocument、可提取文本的 PDF、RTF、CSV、EPUB 文档转换为 Markdown
- 🌓 **明暗模式** - 支持浅色、深色界面切换
- 🔌 **开发者友好** - 提供 CLI、REST API 和 MCP 协议集成
- ⌨️ **快捷操作** - 命令面板 + 全局快捷键，高效操作

## 🚀 快速开始

前置条件：Node.js >= 20、pnpm 11.11.0。

```bash
# 克隆项目
git clone https://github.com/miantiao-me/bm.md.git
cd bm.md

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:2663 开始使用。

本地生产构建与预览：

```bash
pnpm build
pnpm preview
```

### 环境变量

环境变量均为可选配置，可参考 `.env.example`：

- `VITE_APP_URL`、`VITE_API_URL`：客户端可用的应用与 API 地址。
- `ANALYTICS_SCRIPT_URL`、`ANALYTICS_SITE_ID`：服务端读取的统计分析配置。
- `S3_ENDPOINT`、`S3_ACCESS_KEY_ID`、`S3_SECRET_ACCESS_KEY`：三项均配置时启用 S3；`S3_BUCKET`、`S3_REGION`、`S3_PUBLIC_BASE_URL` 用于配置存储目标与公开访问地址。
- `DC_UPLOAD_URL`：可选的 DC 图床上传地址。S3 启用所需配置不完整时，存储服务回退到 DC 图床。

### CLI 使用

`bmmd` 可在命令行中复用核心 Markdown 处理能力，支持文件输入或 stdin，默认输出到 stdout。安装后直接使用 `bmmd`；未安装时可通过 `pnpm dlx bmmd` 临时运行。

```bash
# 全局安装后运行
pnpm add -g bmmd
bmmd render article.md --platform wechat --output article.html

# 临时运行，无需安装
pnpm dlx bmmd render article.md --platform wechat --output article.html

# 管道输入
cat article.md | bmmd extract

# 修复 Markdown 并写回源文件
bmmd lint article.md --fix
```

本地开发可执行 `pnpm build:cli` 构建 CLI，入口文件为 `bin/bmmd.mjs`。

## 🛠️ 技术栈

- **框架**: [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router)
- **构建**: [Vite 8](https://vite.dev)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **部署**: [Nitro](https://nitro.build) (支持 Cloudflare Workers / Vercel / Netlify / Docker / Alibaba ESA / Tencent EdgeOne 等)

阿里云部署配置：

```txt
安装命令: pnpm install
构建命令: pnpm run build
根目录: /
静态资源目录: dist/client
函数文件路径: dist/server/server.js
```

腾讯云 EdgeOne 部署配置：

```txt
框架预设: Other
根目录: ./
输出目录: .edgeone
编译命令: pnpm run build
安装命令: pnpm install
```

EdgeOne 构建环境由 std-env 自动识别，Nitro 会自动选择官方 preset。

其他环境部署配置参考 [Nitro](https://nitro.build/deploy) 文档。

## 📖 文档

- [功能说明](https://github.com/miantiao-me/bm.md/blob/master/docs/features.md) - 完整功能介绍
- [架构设计](https://github.com/miantiao-me/bm.md/blob/master/docs/architecture.md) - 技术架构详解
- [UI 设计](https://github.com/miantiao-me/bm.md/blob/master/docs/design.md) - 界面设计说明
- [UI Skill](https://github.com/miantiao-me/bm.md/blob/master/docs/ui-skill.md) - 智能代理 UI 约束
- [API 文档](https://bm.md/docs) - REST API 参考

## 🙏 致谢

- [Kami](https://github.com/tw93/Kami) — 「Kami」排版风格的灵感来源。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

[LGPL-3.0](https://github.com/miantiao-me/bm.md/blob/master/LICENSE)
