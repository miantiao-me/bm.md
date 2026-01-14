---
name: bm-md
description: 使用 bm.md 服务进行 Markdown 排版、渲染和格式转换，支持微信公众号、知乎、掘金等多平台
---

# bm.md Markdown 排版技能

## 概述

bm.md 是一个专业的 Markdown 排版工具，提供以下核心能力：

- **Markdown 渲染**：将 Markdown 转换为带样式的 HTML，支持 14 种排版风格
- **HTML 转 Markdown**：将 HTML 内容逆向转换为 Markdown 格式
- **纯文本提取**：从 Markdown 中提取纯文本，移除所有格式标记
- **格式校验与修复**：自动检测并修复 Markdown 格式问题

所有 API 均返回 JSON 格式响应，结果在 `result` 字段中。

---

## 可用工具

### 1. Markdown 渲染

将 Markdown 源文本渲染为带内联样式的 HTML，可直接复制到富文本编辑器。

**端点**: `POST https://bm.md/api/markdown/render`

**请求参数**:

| 参数                   | 类型    | 必填 | 默认值         | 说明                                                                  |
| ---------------------- | ------- | ---- | -------------- | --------------------------------------------------------------------- |
| `markdown`             | string  | 是   | -              | Markdown 源文本，支持 GFM 语法、数学公式                              |
| `markdownStyle`        | string  | 否   | `ayu-light`    | 排版样式 ID，见下方完整列表                                           |
| `codeTheme`            | string  | 否   | `kimbie-light` | 代码块高亮主题 ID，见下方完整列表                                     |
| `customCss`            | string  | 否   | `""`           | 自定义 CSS，选择器需约束在 `#bm-md` 下，如 `#bm-md h1 { color: red }` |
| `enableFootnoteLinks`  | boolean | 否   | `true`         | 是否将链接转换为脚注形式                                              |
| `openLinksInNewWindow` | boolean | 否   | `true`         | 是否在新窗口打开链接                                                  |
| `platform`             | string  | 否   | `html`         | 目标平台：`html`、`wechat`、`zhihu`、`juejin`                         |

**curl 示例**:

````bash
curl -X POST https://bm.md/api/markdown/render \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 标题\n\n这是一段**加粗**的文字。\n\n```javascript\nconsole.log(\"Hello, World!\");\n```",
    "markdownStyle": "ayu-light",
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

| ID                  | 名称              | 风格描述                   |
| ------------------- | ----------------- | -------------------------- |
| `ayu-light`         | Ayu Light         | 清新淡雅的浅色主题（默认） |
| `bauhaus`           | Bauhaus           | 包豪斯风格，几何与功能主义 |
| `blueprint`         | Blueprint         | 蓝图风格，工程设计感       |
| `botanical`         | Botanical         | 植物园风格，自然柔和       |
| `green-simple`      | GreenSimple       | 绿色简约风格               |
| `maximalism`        | Maximalism        | 极繁主义，丰富装饰         |
| `neo-brutalism`     | Neo-Brutalism     | 新野兽派，大胆对比         |
| `newsprint`         | Newsprint         | 报纸印刷风格               |
| `organic`           | Organic           | 有机自然风格               |
| `playful-geometric` | Playful Geometric | 活泼几何图形风格           |
| `professional`      | Professional      | 专业商务风格               |
| `retro`             | Retro             | 复古怀旧风格               |
| `sketch`            | Sketch            | 手绘素描风格               |
| `terminal`          | Terminal          | 终端/命令行风格            |

### 代码主题 (codeTheme)

| ID                   | 名称               | 类型 |
| -------------------- | ------------------ | ---- |
| `tokyo-night-light`  | Tokyo Night Light  | 浅色 |
| `tokyo-night-dark`   | Tokyo Night Dark   | 深色 |
| `panda-syntax-light` | Panda Syntax Light | 浅色 |
| `panda-syntax-dark`  | Panda Syntax Dark  | 深色 |
| `rose-pine-dawn`     | Rosé Pine Dawn     | 浅色 |
| `rose-pine`          | Rosé Pine          | 深色 |
| `kimbie-light`       | Kimbie Light       | 浅色 |
| `kimbie-dark`        | Kimbie Dark        | 深色 |
| `paraiso-light`      | Paraiso Light      | 浅色 |
| `paraiso-dark`       | Paraiso Dark       | 深色 |

### 目标平台 (platform)

| ID       | 说明                           |
| -------- | ------------------------------ |
| `html`   | 通用网页，标准 HTML 输出       |
| `wechat` | 微信公众号，针对微信编辑器优化 |
| `zhihu`  | 知乎专栏，适配知乎排版规范     |
| `juejin` | 掘金，适配掘金编辑器           |

---

## 使用场景

1. **内容创作者**：将 Markdown 文章一键转换为微信公众号格式，直接粘贴发布
2. **跨平台发布**：同一份 Markdown 源文件，生成适配不同平台的 HTML
3. **内容迁移**：将网页内容转换为 Markdown 进行存档或编辑
4. **文本分析**：提取纯文本用于字数统计、关键词分析等

---

## 注意事项

1. **数学公式**：支持 `$...$`（行内）和 `$$...$$`（块级）语法
2. **GFM 语法**：完整支持 GitHub Flavored Markdown，包括表格、任务列表、删除线等
3. **图片处理**：图片 URL 需为可公开访问的地址
4. **样式内联**：输出的 HTML 已将 CSS 内联到元素上，可直接复制使用
5. **编码要求**：请求和响应均使用 UTF-8 编码
