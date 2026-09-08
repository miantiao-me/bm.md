---
name: bm-md
description: 使用 bm.md 写作、改写、排版或渲染 Markdown；生成 Mermaid 与 AntV Infographic，设置图片尺寸、高亮重点，以及执行 HTML/纯文本转换和 Markdown lint
---

# bm.md Markdown 排版技能

## 核心能力

使用 bm.md 完成以下任务：

- **Markdown 渲染**：将 Markdown 转换为带样式的 HTML，支持 8 种排版风格、文本高亮与图片尺寸
- **HTML 转 Markdown**：将 HTML 内容逆向转换为 Markdown 格式
- **纯文本提取**：从 Markdown 中提取纯文本，移除所有格式标记
- **格式校验与修复**：自动检测并修复 Markdown 格式问题

## 核心工作流

1. **明确交付目标**：确认受众、输出平台、事实边界与期望文件；信息不足时先询问，不猜测事实或数值。
2. **先组织正文**：先完成标题层级、段落、列表、表格、引用和代码，再考虑视觉增强。
3. **按语义选择增强**：只在增强理解时加入 Mermaid、Infographic、高亮或图片尺寸。遵循下方决策规则并按需读取对应参考。
4. **执行渲染**：优先使用 CLI；本地无法执行命令或用户明确要求远程调用时，改用 REST API。
5. **检查并回退**：检查命令状态、响应的 `result`、图表错误和关键信息完整性。增强语法失败时先修正；仍失败则回退为结构清晰的正文、列表或表格，不交付损坏的图表。

## 增强决策与按需参考

- 流程、调用链、状态、类关系或 ER 模型：使用 [Mermaid](references/mermaid.md)。
- 并列、步骤、比较、层级、关系或真实数值：使用 [AntV Infographic](references/infographic.md)。字段与模板绑定，按参考中的已验证示例生成。
- 局部关键结论：使用[文本高亮](references/rich-markdown.md)，不要整段高亮。
- 用户给定尺寸或布局确需固定尺寸：使用[图片尺寸语法](references/rich-markdown.md)；不知道尺寸时保留普通图片。

保持克制：不要用图表装饰简单内容，不要用 Mermaid 和 Infographic 重复表达同一信息，不要虚构事实或数值。生成丰富 Markdown 后，必须通过 bm.md 渲染并检查结果。

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

| ID              | 名称          | 风格描述                       |
| --------------- | ------------- | ------------------------------ |
| `kami`          | Kami          | 简洁的纸张阅读风格（默认）     |
| `bauhaus`       | Bauhaus       | 包豪斯风格，几何与功能主义     |
| `blueprint`     | Blueprint     | 蓝图风格，工程设计感           |
| `botanical`     | Botanical     | 植物园风格，自然柔和           |
| `newsprint`     | Newsprint     | 报纸印刷风格                   |
| `retro`         | Retro         | 复古怀旧风格                   |
| `sketch`        | Sketch        | 手绘素描风格                   |
| `terminal`      | Terminal      | 终端/命令行风格                |
| `black-ledger`  | Black Ledger  | 黑白账本风格，纯墨色的文献质感 |
| `forest-review` | Forest Review | 森林季报风格，暖调编辑排版     |
| `navy-vellum`   | Navy Vellum   | 深蓝羊皮纸风格，静谧的学术手记 |
| `rose-nocturne` | Rose Nocturne | 玫瑰夜曲风格，暗色调时尚编辑   |
| `solar-catalog` | Solar Catalog | 日光图录风格，展览海报质感     |
| `triad-paper`   | Triad Paper   | 三调纸面风格，三色时尚杂志感   |
| `field-tablet`  | Field Tablet  | 田野铭牌风格，考古手册质感     |
| `public-square` | Public Square | 公共广场风格，行动主义海报     |
| `pixel-orbit`   | Pixel Orbit   | 像素轨道风格，复古像素街机     |

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

## 注意事项

1. **数学公式**：支持 `$...$`（行内）和 `$$...$$`（块级）语法
2. **GFM 语法**：完整支持 GitHub Flavored Markdown，包括表格、任务列表、删除线等
3. **图片处理**：图片 URL 需为可公开访问的地址
4. **样式内联**：输出的 HTML 已将 CSS 内联到元素上，可直接复制使用
5. **编码要求**：请求和响应均使用 UTF-8 编码
