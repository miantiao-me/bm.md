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
  primary: "oklch(0.72 0.16 62)"
  primary-foreground: "oklch(0.99 0.002 264)"
  secondary: "oklch(0.96 0.005 264)"
  secondary-foreground: "oklch(0.44 0.02 264)"
  muted: "oklch(0.96 0.005 264)"
  muted-foreground: "oklch(0.58 0.02 264)"
  accent: "oklch(0.96 0.005 264)"
  accent-foreground: "oklch(0.44 0.02 264)"
  destructive: "oklch(0.61 0.18 25)"
  destructive-foreground: "oklch(0.99 0.002 264)"
  success: "oklch(0.72 0.17 136)"
  success-foreground: "oklch(0.99 0.002 264)"
  warning: "oklch(0.76 0.15 77)"
  warning-foreground: "oklch(0.25 0.05 77)"
  info: "oklch(0.73 0.09 231)"
  info-foreground: "oklch(0.99 0.002 264)"
  border: "oklch(0.55 0.02 264 / 0.12)"
  input: "oklch(0.55 0.02 264 / 0.2)"
  ring: "oklch(0.72 0.16 62)"
  editor: "oklch(0.9816 0.0018 248.6)"
  dark-background: "oklch(0.26 0.025 264)"
  dark-foreground: "oklch(0.83 0.015 77)"
  dark-card: "oklch(0.2 0.025 264)"
  dark-popover: "oklch(0.22 0.025 264)"
  dark-primary: "oklch(0.86 0.13 87)"
  dark-primary-foreground: "oklch(0.18 0.02 264)"
  dark-secondary: "oklch(0.22 0.025 264)"
  dark-muted: "oklch(0.22 0.025 264)"
  dark-muted-foreground: "oklch(0.56 0.025 264)"
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

# bm.md Design System

## Overview

bm.md 是面向 Markdown 编辑、排版、检查与自动化接口的工具型产品。界面应表现为冷静、清晰、工程化，而不是营销化或娱乐化。视觉风格来自 Ayu Light / Ayu Mirage：以蓝灰中性色承载长时间阅读与编辑，以橙黄主色标记关键交互。

设计源以代码为准：`src/styles.css` 注册 Tailwind 4 token，`src/themes/shadcn/ayu-light.css` 与 `src/themes/shadcn/ayu-mirage.css` 提供亮暗色值，`src/components/ui` 提供组件形态。`DESIGN.md` 中 front matter 是规范值；正文只解释意图与使用规则。

整体方向是高密度桌面工具：控件小、边界清楚、层级克制、动效短促。不要引入与编辑器气质冲突的装饰性渐变、过度圆角或大面积阴影。

## Colors

色彩系统使用 OKLCH，亮色主题基于 Ayu Light，暗色主题基于 Ayu Mirage。色彩语义继承 shadcn/ui：`background` / `foreground`、`card`、`popover`、`primary`、`secondary`、`muted`、`accent`、`destructive`、`border`、`input`、`ring`。

- **Primary**：亮色为 Ayu 橙 `oklch(0.72 0.16 62)`，暗色为 Ayu 黄 `oklch(0.86 0.13 87)`。只用于每屏最重要动作、焦点环、选中态或关键高亮。
- **Neutral surfaces**：背景、卡片、弹层均是低彩度蓝灰；通过明度差和边框区分层级，避免彩色面板泛滥。
- **Feedback colors**：`success`、`warning`、`info`、`destructive` 是项目扩展语义色。只用于状态反馈、校验和告警，不替代主操作色。
- **Editor surface**：`editor` 对齐 CodeMirror 背景，编辑区不要直接套用普通 `card` 色。
- **Sidebar colors**：侧边栏使用独立 `sidebar-*` token，保持导航区域与主编辑区解耦。

正常文本必须满足 WCAG AA 4.5:1。当前亮色主题中 `primary` 与 `primary-foreground` 的对比度不足以承载小号正文；在源 token 修正前，主色更适合用于焦点、图标、边框、选中态或极短操作标签。不要在 `muted`、`accent` 等浅色表面上叠加低透明度正文；辅助文本才使用 `muted-foreground`。

## Typography

默认字体是系统无衬线：`--font-sans: sans-serif`，全局 `body` 使用 `font-sans antialiased`。界面控件以 `text-xs` 为主，卡片标题和少量标题使用 `text-sm`，让编辑器、面板和命令菜单保持紧凑。

- **正文与说明**：Markdown 内容区由 `@tailwindcss/typography` 控制；普通 UI 说明使用 `body-sm` 或 `caption-xs`。
- **控件文字**：按钮、输入框、菜单项、选择器、标签优先使用 `control-xs`，必要时用 `font-medium` 强调可点击性。
- **品牌装饰**：`.doto-font` 仅用于 Logo 或极少量品牌化文字，字体为 `'Doto', monospace`，`font-weight: 700`，可变轴固定为 `'wght' 700, 'ROND' 0`。

单屏不要混用超过两种字重。除非是 Markdown 正文渲染，不要为 UI 控件单独引入新字体或大字号展示风格。

## Layout

布局遵循 Tailwind 间距 scale，面向工具型高密度界面。基础控件高度以 `h-8` 为默认，紧凑控件使用 `h-7` / `h-6`，图标按钮使用对应 `size-8` / `size-7` / `size-6`。

- 用 `gap`、`px`、`py` 表达空间关系，优先选择 `0.5rem`、`0.625rem`、`0.75rem`、`1rem` 等小步进。
- 全屏或视口高度必须使用 `h-dvh` / `100dvh`，不要使用 `h-screen`。
- 可滚动区域保持细滚动条：WebKit 宽高 6px，默认透明，hover 时用 `foreground` 混合色显示。
- CodeMirror 编辑器滚动条只在编辑器 hover 时显露，避免长期干扰文本阅读。

组件布局应先保证可读性与可操作性，再追求装饰。不要为了视觉留白牺牲编辑器、预览区和工具面板的有效面积。

## Elevation & Depth

bm.md 主要通过边框、色面和 ring 表达层级，而不是通过重阴影制造深度。

- 弹层类组件（DropdownMenu、Select、Popover、Sheet、Menubar）使用 `shadow-md` 或 `shadow-lg` 搭配 `ring-1 ring-foreground/10`。
- Dialog 以居中布局、`bg-popover`、`ring-1 ring-foreground/10` 和轻量 zoom/fade 动画建立层级，不依赖大阴影。
- Tooltip 使用 `bg-foreground text-background` 的反色关系，不额外加阴影。
- Sidebar 的浮动与 inset 形态可使用 `shadow-sm`，但仍应以边框/ring 为主要分隔。

新增界面时优先使用 `border-border`、`ring-ring/50`、`bg-muted`、`bg-popover` 来建立深度。不要叠加多层阴影或彩色阴影。

## Shapes

形状语言是“锐利、工程化、低装饰”。虽然全局 radius token 从 `--radius: 0.375rem` 派生出 `sm` 到 `4xl`，实际组件默认大量使用 `rounded-none`。这是刻意的零圆角设计，不是遗漏。

- 按钮、输入框、卡片、弹层、菜单项、标签、表格容器等矩形控件默认直角。
- `Avatar`、状态点、Spinner、Switch thumb 等天然圆形元素使用 `rounded-full`。
- 同一视图不要混用大圆角卡片与直角工具控件。若必须使用圆角，只用于头像、圆形状态、品牌装饰或第三方内容缩略图。

## Components

`src/components/ui` 由 shadcn/ui 风格组件和项目定制组件组成，底层优先使用 `@base-ui/react` 无障碍原语，图标只使用 `lucide-react`，变体通常由 `class-variance-authority` 定义，类名通过 `cn()` 合并。

主要组件包括：Accordion、Alert、AlertDialog、AspectRatio、Avatar、Badge、Breadcrumb、Button、ButtonGroup、Calendar、Card、Carousel、Chart、Checkbox、Collapsible、Combobox、Command、ContextMenu、Dialog、Drawer、DropdownMenu、Field、HoverCard、Input、InputGroup、InputOTP、Kbd、Label、Menubar、NativeSelect、NavigationMenu、Pagination、Popover、Progress、RadioGroup、Resizable、ScrollArea、Select、Separator、Sheet、Sidebar、Skeleton、Slider、Sonner、Spinner、Switch、Table、Tabs、Textarea、Toggle、ToggleGroup、Tooltip。

项目定制组件包括：Attachment、Bubble、Direction、Empty、Item、Marker、Message、MessageScroller、SunIcon。它们服务于消息、附件、空状态、方向提示与主题切换等场景，应沿用同样的直角、高密度与语义色规则。

组件规则：

- **Button**：变体为 `default`、`outline`、`secondary`、`ghost`、`destructive`、`link`；尺寸为 `default`、`xs`、`sm`、`lg`、`icon`、`icon-xs`、`icon-sm`、`icon-lg`。默认 `text-xs font-medium rounded-none`，按压反馈是 `active:translate-y-px`。
- **Input / Textarea / Select**：默认直角、细边框、透明背景、`focus-visible:border-ring` 与 `focus-visible:ring-1 ring-ring/50`。错误态使用 destructive 边框和 ring。
- **Menu / Popover / SelectContent**：使用 `bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10`，通过 `data-open` / `data-closed` 驱动 fade、zoom 和 slide 动画。
- **Badge / Kbd / Toggle / Tabs**：保持紧凑高度与 `text-xs`。Tabs 支持默认填充形态和 `line` 下划线形态。
- **Card / Item / Empty**：用于信息组织，默认以边框、背景色和紧凑 padding 建立结构，不做营销卡片式大圆角。
- **Skeleton / Spinner**：Skeleton 使用 `animate-pulse bg-muted`；Spinner 使用旋转动画。加载态要简短、低干扰。
- **Sonner**：Toast 通过 CSS 变量映射到 `--popover`、`--popover-foreground`、`--border`，保持与主题一致。

不要直接手改 `src/components/ui` 生成组件；需要新增或重置 shadcn 组件时使用 `pnpm shadcn add <component>`。

## Do's and Don'ts

- Do 使用 `primary` 标记单屏最重要动作，不要把多个普通按钮都做成主按钮。
- Do 使用 `bg-background text-foreground`、`bg-card text-card-foreground`、`bg-popover text-popover-foreground` 成对 token。
- Do 用 `border`、`ring`、`muted`、`popover` 表达层级，保持工具界面的克制感。
- Do 保持 `text-xs` 控件体系和小步进间距，新增组件先匹配现有密度。
- Do 为纯图标按钮提供 `aria-label`，交互控件保留可见 focus ring。
- Do 只动画 `transform` 和 `opacity`；入场/退出优先使用 `tw-animate-css` 的 `animate-in` / `animate-out`。
- Don't 在亮色主题中把 `primary` 背景上的 `primary-foreground` 当作普通正文配色；若文本较长或字号较小，应先保证 4.5:1 对比度。
- Don't 使用渐变、彩色阴影、玻璃拟态或营销页式大面积装饰。
- Don't 对 `width`、`height`、`margin`、`padding` 等布局属性做动画。
- Don't 使用 `h-screen`，应使用 `h-dvh` 或 `100dvh`。
- Don't 使用任意 `z-[...]`；需要层级时使用项目已有固定刻度。
- Don't 在同一视图混用大圆角卡片和直角控件。
- Don't 引入除 `lucide-react` 之外的图标库。
