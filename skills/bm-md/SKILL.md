---
name: bm-md
description: 使用 bm.md 服务进行 Markdown 排版、渲染和格式转换，支持微信公众号与通用 HTML 输出
---

# bm.md Markdown 排版技能

## 概述

bm.md 是一个专业的 Markdown 排版工具，提供以下核心能力：

- **Markdown 渲染**：将 Markdown 转换为带样式的 HTML，支持 8 种排版风格
- **HTML 转 Markdown**：将 HTML 内容逆向转换为 Markdown 格式
- **纯文本提取**：从 Markdown 中提取纯文本，移除所有格式标记
- **格式校验与修复**：自动检测并修复 Markdown 格式问题

优先使用本地 CLI，只有在无 Node.js 环境或无法执行命令时才使用 REST API。

## 执行优先级

1. **优先使用 CLI**：如果本地可执行 `node --version`，使用 `bmmd` 命令处理 Markdown。
2. **CLI 调用方式**：如果系统已安装 `bmmd`，直接使用；否则使用 `npx -y bmmd` 临时运行。
3. **兜底使用 REST API**：如果没有 Node.js 环境、无法执行本地命令，或用户明确要求远程调用，再使用 `https://bm.md/api/markdown/*`。

CLI 默认将结果输出到 stdout，可通过 `--output <file>` 写入文件。REST API 返回 JSON，结果在 `result` 字段中。

---

## 可用工具

### 1. Markdown 渲染

将 Markdown 源文本渲染为带内联样式的 HTML，可直接复制到富文本编辑器。

**CLI 示例（优先）**:

```bash
npx -y bmmd render article.md --platform wechat --output article.html
```

支持 stdin：

```bash
cat article.md | npx -y bmmd render --platform wechat > article.html
```

**端点**: `POST https://bm.md/api/markdown/render`

**请求参数**:

| 参数                   | 类型    | 必填 | 默认值         | 说明                                                                  |
| ---------------------- | ------- | ---- | -------------- | --------------------------------------------------------------------- |
| `markdown`             | string  | 是   | -              | Markdown 源文本，支持 GFM 语法、数学公式                              |
| `markdownStyle`        | string  | 否   | `kami`         | 排版样式 ID，见下方完整列表                                           |
| `codeTheme`            | string  | 否   | `kimbie-light` | 代码块高亮主题 ID，见下方完整列表                                     |
| `mermaidTheme`         | string  | 否   | `""`           | Mermaid 流程图主题 ID，空字符串表示使用默认主题                       |
| `infographicTheme`     | string  | 否   | `default`      | Infographic 信息图主题 ID                                             |
| `infographicPalette`   | string  | 否   | `antv`         | Infographic 信息图配色 ID                                             |
| `customCss`            | string  | 否   | `""`           | 自定义 CSS，选择器需约束在 `#bm-md` 下，如 `#bm-md h1 { color: red }` |
| `enableFootnoteLinks`  | boolean | 否   | `true`         | 是否将链接转换为脚注形式                                              |
| `openLinksInNewWindow` | boolean | 否   | `true`         | 是否在新窗口打开链接                                                  |
| `platform`             | string  | 否   | `html`         | 目标平台：`html`、`wechat`                                            |
| `footnoteLabel`        | string  | 否   | `Footnotes`    | GFM 脚注区域标题                                                      |
| `referenceTitle`       | string  | 否   | `References`   | 外部链接参考区域标题                                                  |

**curl 示例**:

````bash
curl -X POST https://bm.md/api/markdown/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 标题\n\n这是一段**加粗**的文字。\n\n```javascript\nconsole.log(\"Hello, World!\");\n```",
    "markdownStyle": "kami",
    "codeTheme": "kimbie-light",
    "platform": "wechat"
  }' \
  -o bm.md.json
````

**响应示例**:

```json
{
  "result": "<div id=\"bm-md\"><h1 style=\"...\">标题</h1>...</div>"
}
```

---

### 2. HTML 转 Markdown

将 HTML 源代码转换为 Markdown 格式。

**CLI 示例（优先）**:

```bash
npx -y bmmd parse page.html --output article.md
```

支持 stdin：

```bash
cat page.html | npx -y bmmd parse > article.md
```

**端点**: `POST https://bm.md/api/markdown/parse`

**请求参数**:

| 参数   | 类型   | 必填 | 说明                              |
| ------ | ------ | ---- | --------------------------------- |
| `html` | string | 是   | HTML 源代码，可以是完整文档或片段 |

**curl 示例**:

```bash
curl -X POST https://bm.md/api/markdown/parse \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>标题</h1><p>这是一段<strong>加粗</strong>的文字。</p>"
  }' \
  -o bm.md.json
```

**响应示例**:

```json
{
  "result": "# 标题\n\n这是一段**加粗**的文字。"
}
```

---

### 3. 提取纯文本

从 Markdown 中提取纯文本内容，移除所有格式标记，保留段落分隔。

**CLI 示例（优先）**:

```bash
npx -y bmmd extract article.md --output article.txt
```

**端点**: `POST https://bm.md/api/markdown/extract`

**请求参数**:

| 参数       | 类型   | 必填 | 说明            |
| ---------- | ------ | ---- | --------------- |
| `markdown` | string | 是   | Markdown 源文本 |

**curl 示例**:

```bash
curl -X POST https://bm.md/api/markdown/extract \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 标题\n\n这是一段**加粗**的文字，包含[链接](https://example.com)。"
  }' \
  -o bm.md.json
```

**响应示例**:

```json
{
  "result": "标题\n\n这是一段加粗的文字，包含链接。"
}
```

---

### 4. Markdown 格式化

校验并自动修复 Markdown 格式问题，统一代码风格。

**CLI 示例（优先）**:

```bash
# 输出修复后的 Markdown
npx -y bmmd lint article.md --output article.fixed.md

# 直接写回源文件
npx -y bmmd lint article.md --fix
```

**端点**: `POST https://bm.md/api/markdown/lint`

**请求参数**:

| 参数       | 类型   | 必填 | 说明                     |
| ---------- | ------ | ---- | ------------------------ |
| `markdown` | string | 是   | 待校验的 Markdown 源文本 |

**curl 示例**:

```bash
curl -X POST https://bm.md/api/markdown/lint \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "#标题\n这是一段文字,没有正确的空格。\n-列表项1\n-列表项2"
  }' \
  -o bm.md.json
```

**响应示例**:

```json
{
  "result": "# 标题\n\n这是一段文字，没有正确的空格。\n\n- 列表项1\n- 列表项2"
}
```

---

## 参数参考

### 排版样式 (markdownStyle)

| ID          | 名称      | 风格描述                   |
| ----------- | --------- | -------------------------- |
| `kami`      | Kami      | 简洁的纸张阅读风格（默认） |
| `bauhaus`   | Bauhaus   | 包豪斯风格，几何与功能主义 |
| `blueprint` | Blueprint | 蓝图风格，工程设计感       |
| `botanical` | Botanical | 植物园风格，自然柔和       |
| `newsprint` | Newsprint | 报纸印刷风格               |
| `retro`     | Retro     | 复古怀旧风格               |
| `sketch`    | Sketch    | 手绘素描风格               |
| `terminal`  | Terminal  | 终端/命令行风格            |

### 代码主题 (codeTheme)

| ID                     | 名称                 | 类型 |
| ---------------------- | -------------------- | ---- |
| `catppuccin-latte`     | Catppuccin Latte     | 浅色 |
| `catppuccin-frappe`    | Catppuccin Frappé    | 深色 |
| `catppuccin-macchiato` | Catppuccin Macchiato | 深色 |
| `catppuccin-mocha`     | Catppuccin Mocha     | 深色 |
| `kimbie-light`         | Kimbie Light         | 浅色 |
| `kimbie-dark`          | Kimbie Dark          | 深色 |
| `panda-syntax-light`   | Panda Syntax Light   | 浅色 |
| `panda-syntax-dark`    | Panda Syntax Dark    | 深色 |
| `paraiso-light`        | Paraiso Light        | 浅色 |
| `paraiso-dark`         | Paraiso Dark         | 深色 |
| `rose-pine-dawn`       | Rosé Pine Dawn       | 浅色 |
| `rose-pine`            | Rosé Pine            | 深色 |
| `tokyo-night-light`    | Tokyo Night Light    | 浅色 |
| `tokyo-night-dark`     | Tokyo Night Dark     | 深色 |

### 目标平台 (platform)

| ID       | 说明                           |
| -------- | ------------------------------ |
| `html`   | 通用网页，标准 HTML 输出       |
| `wechat` | 微信公众号，针对微信编辑器优化 |

---

## 使用场景

1. **内容创作者**：将 Markdown 文章一键转换为微信公众号格式，直接粘贴发布
2. **多端发布**：同一份 Markdown 源文件，生成适配不同输出场景的 HTML
3. **内容迁移**：将网页内容转换为 Markdown 进行存档或编辑
4. **文本分析**：提取纯文本用于字数统计、关键词分析等

---

## 注意事项

1. **数学公式**：支持 `$...$`（行内）和 `$$...$$`（块级）语法
2. **GFM 语法**：完整支持 GitHub Flavored Markdown，包括表格、任务列表、删除线等
3. **图片处理**：图片 URL 需为可公开访问的地址
4. **样式内联**：输出的 HTML 已将 CSS 内联到元素上，可直接复制使用
5. **编码要求**：请求和响应均使用 UTF-8 编码
