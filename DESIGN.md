---
version: alpha
name: bm.md
description: "bm.md 的设计系统，基于 Ayu Light / Ayu Mirage、Tailwind CSS 4 与 shadcn/ui。"
colors:
  background: "oklch(0.98 0.004 264)"
  foreground: "oklch(0.44 0.02 264)"
  card: "oklch(0.99 0.002 264)"
  card-foreground: "oklch(0.44 0.02 264)"
  popover: "oklch(0.98 0.003 264)"
  popover-foreground: "oklch(0.44 0.02 264)"
  primary: "oklch(0.64 0.14 62)"
  primary-foreground: "oklch(0.2 0.05 62)"
  secondary: "oklch(0.96 0.005 264)"
  secondary-foreground: "oklch(0.44 0.02 264)"
  muted: "oklch(0.96 0.005 264)"
  muted-foreground: "oklch(0.52 0.02 264)"
  accent: "oklch(0.96 0.005 264)"
  accent-foreground: "oklch(0.44 0.02 264)"
  destructive: "oklch(0.61 0.18 25)"
  destructive-foreground: "oklch(0.16 0.04 25)"
  success: "oklch(0.72 0.17 136)"
  success-foreground: "oklch(0.25 0.06 136)"
  warning: "oklch(0.76 0.15 77)"
  warning-foreground: "oklch(0.25 0.05 77)"
  info: "oklch(0.73 0.09 231)"
  info-foreground: "oklch(0.25 0.06 231)"
  border: "oklch(0.55 0.02 264 / 0.12)"
  input: "oklch(0.55 0.02 264 / 0.2)"
  ring: "oklch(0.64 0.14 62)"
  editor: "oklch(0.9816 0.0018 248.6)"
  dark-background: "oklch(0.26 0.025 264)"
  dark-foreground: "oklch(0.83 0.015 77)"
  dark-card: "oklch(0.2 0.025 264)"
  dark-popover: "oklch(0.22 0.025 264)"
  dark-primary: "oklch(0.86 0.13 87)"
  dark-primary-foreground: "oklch(0.18 0.02 264)"
  dark-secondary: "oklch(0.22 0.025 264)"
  dark-muted: "oklch(0.22 0.025 264)"
  dark-muted-foreground: "oklch(0.68 0.02 264)"
  dark-accent: "oklch(0.22 0.025 264)"
  dark-destructive: "oklch(0.67 0.2 17)"
  dark-success: "oklch(0.82 0.15 136)"
  dark-warning: "oklch(0.86 0.13 87)"
  dark-info: "oklch(0.81 0.09 213)"
  dark-border: "oklch(0.31 0.02 264)"
  dark-input: "oklch(0.3 0.02 264)"
  dark-ring: "oklch(0.86 0.13 87)"
  dark-editor: "oklch(0.2608 0.0238 267.1)"
typography:
  body-md:
    fontFamily: sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  control-xs:
    fontFamily: sans-serif
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1rem
  title-sm:
    fontFamily: sans-serif
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.25rem
  caption-xs:
    fontFamily: sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
  doto-logo:
    fontFamily: "'Doto', monospace"
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1
    fontVariation: "'wght' 700, 'ROND' 0"
rounded:
  none: 0px
  sm: 0.125rem
  md: 0.25rem
  lg: 0.375rem
  xl: 0.625rem
  2xl: 0.875rem
  3xl: 1.125rem
  4xl: 1.375rem
  full: 9999px
spacing:
  hairline: 1px
  xxs: 0.125rem
  xs: 0.25rem
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  3xl: 3rem
  viewport-height: 100dvh
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    height: "{spacing.2xl}"
    padding: "{spacing.sm}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    height: "{spacing.2xl}"
    padding: "{spacing.sm}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    height: "{spacing.2xl}"
    padding: "{spacing.sm}"
  input:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    height: "{spacing.2xl}"
    padding: "{spacing.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    height: "1.25rem"
    padding: "{spacing.sm}"
  tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.control-xs}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
---

# bm.md 设计系统规范

## 系统概览

bm.md 是一款面向 Markdown 排版、语法校验与自动化发布的工程化工具。界面视觉与交互遵循**克制、沉静、高密度**的工具型设计原则，避免营销类或消费类产品常见的过度装饰。

视觉风格建立在 Ayu Light 与 Ayu Mirage 之上：以低彩度的蓝灰中性表面承载长时间的高频阅读与编辑，以鲜明的橙黄色相标注最关键的操作焦点。

### 事实源约定

- **设计 Token 事实源**：本文件顶部的 YAML Front Matter 为设计 Token 声明；代码实现对应 `src/styles.css`（Tailwind CSS 4 注册）、`src/themes/shadcn/ayu-light.css` 与 `src/themes/shadcn/ayu-mirage.css`（亮暗色值）。
- **组件形态事实源**：基础控件形态以 `src/components/ui/` 为准。本规范正文阐述各模块的设计取向与协同边界。

---

## 色彩体系（Colors）

色彩系统全面采用 OKLCH 色彩空间，语义命名继承并扩展 shadcn/ui 规范：

### 核心语义角色

- **主操作色（Primary）**：
  - 浅色模式为加深后的 Ayu 橙 `oklch(0.64 0.14 62)`（`#c77618`）；深色模式为金黄 `oklch(0.86 0.13 87)`（`#ffcc66`）。
  - 用于全屏权重最高的核心动作、交互焦点环（Focus Ring）与关键高亮。
  - **对比度加固**：浅色模式下，原版 Ayu 橙 `#f29718` 与浅色文字对比度仅为 2.51:1。为满足无障碍标准，系统加深了橙色相，并将 `primary-foreground` 设定为深色文字 `oklch(0.2 0.05 62)`，使实心按钮上的文字对比度达到 5.22:1，且焦点环对背景的非文字对比度达到 3:1 以上。
- **中性色面（Neutral Surfaces）**：背景（`background`）、卡片（`card`）与浮层（`popover`）均采用极低彩度的蓝灰色系，依靠明度梯度与边框区分层级，避免使用厚重色块。
- **状态反馈色（Feedback Colors）**：`destructive`、`success`、`warning`、`info` 为系统扩展语义色，仅用于操作反馈、校验与警示，不用于普通按钮；浅色模式下均匹配深色 `-foreground` 文本，确保全部满足 WCAG AA 4.5:1 对比度要求。
- **编辑器专属色（Editor Surface）**：`editor` 语义色专用于对齐 CodeMirror 编辑器背景，不可与通用 `card` 混用。
- **侧边栏色组（Sidebar Colors）**：侧边工具条使用独立的 `sidebar-*` 变量，保持与主编辑区的视觉解耦。

---

## 版式系统（Typography）

- **无衬线系统字体**：全局采用 `--font-sans: sans-serif`，`body` 挂载 `font-sans antialiased` 平滑抗锯齿。
- **控件字号梯队**：界面交互控件以 `text-xs` 为主基准；卡片标题与小节标题使用 `text-sm`，确保桌面工具界面的紧凑视域。
- **正文排版**：Markdown 内容由 `@tailwindcss/typography` 统筹排版；普通 UI 说明文字采用 `body-sm` 或 `caption-xs`。
- **品牌字体**：`.doto-font` 仅用于 Logo 与极少数品牌展示场景，采用 `'Doto', monospace`（字重 700，可变轴固定为 `'wght' 700, 'ROND' 0`）。
- **字重约束**：同一交互视窗内不得混用超过两种字重；禁止为常规控件单独引入外挂字体。

---

## 布局与间距（Layout & Spacing）

- **高密度工具视窗**：间距遵循 Tailwind 标度，基础控件高度默认使用 `h-8`，紧凑型控件使用 `h-7` / `h-6`，图标按钮对应使用 `size-8` / `size-7` / `size-6`。
- **动态视口规范**：全屏工作区高度必须使用 `h-dvh`（或 `100dvh`），禁止使用 `h-screen`，避免在触屏或可变视口设备中出现溢出截断。
- **极细滚动条**：滚动区域配置专用细滚动条（宽度 6px），常态透明，仅在鼠标悬停时显现；CodeMirror 编辑器滚动条仅在鼠标悬停于编辑区域时显示，阅读时自动隐匿。
- **有效视区优先**：界面的布局先满足编辑与预览的可用性，不为单方面的视觉留白而压缩核心编辑视窗。

---

## 层级与深度（Elevation & Depth）

bm.md 通过精细的边框、半透明色面与 Focus Ring 表达层级关系，杜绝厚重的漫反射阴影：

- **下拉菜单与气泡浮层（Dropdown / Popover / Select）**：使用 `shadow-md` 结合 `ring-1 ring-foreground/10` 勾勒边界。
- **模态弹窗（Dialog）**：采用居中浮层，结合 `bg-popover`、`ring-1 ring-foreground/10` 与轻度背景模糊遮罩建立焦点，不依赖大尺寸扩散阴影。
- **文字提示（Tooltip）**：采用 `bg-foreground text-background` 反色风格，不附加多余阴影。

---

## 形状语言：直角美学（Shapes）

系统的形状哲学是**锐利、坚固、低装饰**：

- **常规矩形直角化**：常规按钮、文本框、卡片、菜单、标签页、表格容器等均默认使用 `rounded-none`（零圆角）。这是深思熟虑的设计特征，严禁随意改为圆角。
- **全圆角特例**：仅 Avatar、状态指示灯、Switch 滑块等天然圆形元素使用 `rounded-full`。
- **禁止圆角混杂**：同一交互视图中严禁大圆角卡片与直角工具组件并存。

---

## 组件与无障碍（Components & A11y）

基础组件基于 shadcn/ui 与 `@base-ui/react` 封装，图标一律采用 `lucide-react`，类名由 `cn()` 合并：

- **Button**：提供 `default`、`outline`、`secondary`、`ghost`、`destructive`、`link` 变体；按压微动效固定为 `active:translate-y-px`。纯图标按钮必须显式声明 `aria-label`。
- **Input / Textarea / Select**：默认直角、细边框、透明底色；聚焦时显示清晰的 `ring-1 ring-ring/50`；校验错误时呈现 `destructive` 边框与光环。
- **Menu / Popover**：使用 `bg-popover text-popover-foreground`，通过 `data-open` / `data-closed` 驱动极短的淡入微缩放动效。
- **Sonner Toast**：通过 CSS 变量深度对齐 `--popover` 与 `--border`，保持与整站 Ayu 色相完全协调。
- **组件维护边界**：`src/components/ui/` 下的文件均通过 `pnpm shadcn add <component>` 管理，禁止手工随意格式化或破坏其底层结构。

---

## 实践准则（Do's and Don'ts）

### 推荐做法（Do）

- 始终成对使用色彩 Token，例如 `bg-background text-foreground`、`bg-popover text-popover-foreground`。
- 在每个视图内克制使用 `primary`，将其保留给最重要的单一主要操作。
- 依靠 `border`、`ring`、`muted` 建立层次，维持工具软件的理性与克制。
- 保持 `text-xs` 控件尺寸体系与小步进间距，新组件优先贴合既有密度。
- 动效严格局限在 `transform` 与 `opacity`，入场优先使用 `tw-animate-css`。

### 禁止做法（Don't）

- 严禁在修改颜色明度时破坏 WCAG AA 4.5:1 的文字对比度基准（非文字焦点环 3:1）。
- 严禁添加彩色渐变、弥散光晕、玻璃拟态等装饰。
- 严禁对 `width`、`height`、`margin`、`padding` 等布局属性施加过渡动画。
- 严禁使用 `h-screen`；必须使用 `h-dvh` 或 `100dvh`。
- 严禁使用任意的 `z-[...]`，必须从项目已有层级刻度中选用。
- 严禁在主界面中混入非直角组件或除 `lucide-react` 之外的第三方图标库。
