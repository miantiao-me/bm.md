# bm.md

更好用的 Markdown 排版助手｜一键适配微信公众号、~~知乎专栏~~、~~掘金~~、网页与图片。

---

## ✨ 特性

- 📝 **实时预览** - 基于 CodeMirror 6 的 Markdown 编辑器，所见即所得
- 🎨 **14 种排版样式** - 从专业商务到复古怀旧，满足不同场景需求
- 🌈 **14 种代码主题** - 支持浅色/深色多种代码高亮风格
- 📱 **多平台适配** - 一键复制到微信公众号、~~知乎~~、~~掘金~~
- 🖼️ **图片导出** - 将排版内容导出为图片分享
- 🔌 **开发者友好** - 提供 REST API 和 MCP 协议集成
- ⌨️ **快捷操作** - 命令面板 + 全局快捷键，高效操作

## 🚀 快速开始

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

## 🛠️ 技术栈

- **框架**: [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router)
- **构建**: [Vite 7](https://vite.dev)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **部署**: [Nitro](https://nitro.build) (支持 Cloudflare Workers / Vercel / Netlify / Docker / Alibaba ESA / Tencent EdgeOne 等)

本项目由阿里云ESA提供加速、计算和保护: [![Alibaba ESA](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)](https://alibaba.bm.md/)

阿里云部署配置：

```txt
安装命令: pnpm install
构建命令: pnpm run build
根目录: /
静态资源目录: dist/client
函数文件路径: dist/server/server.js
```

其他环境部署配置参考 [Nitro](https://v3.nitro.build/deploy) 文档。

## 📖 文档

- [功能说明](https://github.com/miantiao-me/bm.md/blob/master/docs/features.md) - 完整功能介绍
- [架构设计](https://github.com/miantiao-me/bm.md/blob/master/docs/architecture.md) - 技术架构详解
- [UI 设计](https://github.com/miantiao-me/bm.md/blob/master/docs/design.md) - 界面设计说明
- [API 文档](https://bm.md/docs) - REST API 参考

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

## 📄 许可证

[AGPL-3.0](https://github.com/miantiao-me/bm.md/blob/master/LICENSE)
