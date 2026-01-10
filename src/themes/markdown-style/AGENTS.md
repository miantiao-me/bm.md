# Markdown Style 设计指南

为 bm.md Markdown 排版工具设计 Markdown 转 HTML 样式表。

## 技术约束

1. 所有选择器必须以 `#bm-md` 开头，不使用其他 id 选择器（`#bm-md` 是唯一例外）
2. 不使用 CSS 变量，颜色值直接硬编码
3. 不使用外部字体（无法加载远程字体文件）
4. hr img 等空元素（void elements）不使用 before/after 伪元素添加装饰性内容
5. 不允许使用 absolute/fixed/sticky 等脱离或半脱离普通文档流的定位方式
6. 不使用 float 布局，避免元素脱离文档流导致显示异常
7. 不使用百分比单位的负值（如 `margin-top: -100%`），使用 px 或 em
8. 不使用 transform 属性调整布局或层级，层级控制使用 flex + z-index
9. 图片元素使用 `display: block` 消除图片间白缝
10. 不需要管 `pre code` 内部的语法高亮，只定义 `pre` 容器外观
11. 标题 H1-H6 使用同一色系，颜色逐级变淡；H4-H6 使用相同颜色
12. 不需要媒体查询
13. 布局紧凑，适合多平台阅读

## 必须包含的元素

```
#bm-md
h1, h2, h3, h4, h5, h6
#bm-md > h1:first-child（及 h2-h6，首个标题无 margin-top）
p, p:last-child（最后一个 p 无 margin-bottom）
strong, b
em, i
del, s, strike
mark
small
sup, sub
ins
q, q::before, q::after
var
samp, tt
abbr[title]
a, a:hover
ruby, rt, rp
ul, ol
li, li::marker
li > ul, li > ol
ul ul, ul ul ul
ul.contains-task-list
li.task-list-item
input[type='checkbox']
blockquote
blockquote p, blockquote p:last-child
blockquote blockquote
code
pre
pre code（重置行内代码样式）
table
thead, tfoot
th, td
tbody tr:nth-child(even)
.frontmatter-table
.frontmatter-table td
.frontmatter-key
.frontmatter-value
hr
img
picture, picture img
figure, figure img
figcaption
.footnotes
.footnotes ol
.footnote-ref
.footnote-backref, .data-footnote-backref
dl, dt, dd
kbd
.markdown-alert
.markdown-alert-title
.markdown-alert-note, .markdown-alert-note .markdown-alert-title
.markdown-alert-tip, .markdown-alert-tip .markdown-alert-title
.markdown-alert-important, .markdown-alert-important .markdown-alert-title
.markdown-alert-warning, .markdown-alert-warning .markdown-alert-title
.markdown-alert-caution, .markdown-alert-caution .markdown-alert-title
.math-inline
.math-display
details
summary
details[open] summary
iframe, video
.meta, time
#bm-md.indent-first-line p
```

## 输出

输出完整 CSS 文件，用你的设计风格命名（kebab-case）。
在 `src/themes/markdown-style/index.ts` 中注册。
