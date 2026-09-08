# AntV Infographic 信息图

只在结构化视觉能提升理解时使用 Infographic。将定义放入语言为 `infographic` 的围栏代码块，第一行指定模板，完成 Markdown 后交给 bm.md `render`。

## 信息结构映射

| 信息结构            | 数据入口              | 使用方式                                                 |
| ------------------- | --------------------- | -------------------------------------------------------- |
| 并列清单 `list`     | `lists`               | 展示同级要点                                             |
| 顺序步骤 `sequence` | `sequences`           | 展示有先后的阶段                                         |
| 两方比较 `compare`  | 依模板而定            | 本文已验证模板使用 `data.items`，不要机械改成 `compares` |
| 层级 `hierarchy`    | `root`                | 从单一根节点展开                                         |
| 关系网络 `relation` | `nodes` + `relations` | 先定义节点，再按 ID 连线                                 |
| 数值图表 `chart`    | `values`              | 仅展示来源明确的真实数值                                 |

字段由具体模板决定。优先直接套用下列项目兼容性测试已验证的模板和字段，不要依据类别名称猜字段。

## 六类稳定示例

### 并列清单

```infographic
infographic list-row-simple-horizontal-arrow
data
  lists
    - label 整理正文
      desc 建立清晰结构
    - label 选择增强
      desc 只增强复杂信息
```

### 顺序步骤

```infographic
infographic sequence-steps-simple
data
  title 发布流程
  sequences
    - label 撰写
      desc 完成正文
    - label 检查
      desc 修正格式
    - label 渲染
      desc 生成 HTML
```

### 两方比较

`compare-binary-horizontal-simple-vs` 当前已验证使用 `data.items`：

```infographic
infographic compare-binary-horizontal-simple-vs
data
  items
    - label CLI
      children
        - label 本地优先
    - label REST API
      children
        - label 无法执行 CLI 时兜底
```

### 层级结构

```infographic
infographic hierarchy-structure
data
  root
    label Markdown 文档
    children
      - label 正文
      - label 图表
```

### 关系网络

`relation-network-icon-badge` 当前已验证使用 `nodes`，关系项使用 `- from` 与 `to`：

```infographic
infographic relation-network-icon-badge
data
  nodes
    - id markdown
      label Markdown
    - id html
      label HTML
  relations
    - from markdown
      to html
```

### 真实数值

仅在已知下列数值真实且来源可靠时使用；生成时替换为用户提供的数据。

```infographic
infographic chart-pie-plain-text
data
  values
    - label 已完成
      value 60
    - label 待完成
      value 40
```

## 自检规则

- 第一行必须是 `infographic <模板名>`，围栏语言必须是 `infographic`。
- 层级统一使用两个空格缩进，不使用制表符。
- `relation` 中每个 `from`、`to` 都必须指向 `nodes` 中已存在的 `id`。
- `chart` 的 `value` 只写纯数字，不附加 `%`、单位或文字；单位在正文中说明。
- 不虚构数据、比例、节点或关系。没有可靠数值时改用 list、普通列表或表格。
- 标签与说明跟随正文语言，保持短而明确。
- 不把同一信息再用 Mermaid 重复表达。
- 主题和色板通过 bm.md `render` 参数统一控制。当前有效 `infographicTheme` 为 `default`、`dark`、`hand-drawn`，有效 `infographicPalette` 为 `antv`、`spectral`。

若渲染失败，先对照对应稳定示例检查模板、字段和缩进，再删减为最小定义逐步恢复；仍失败则回退为 Markdown 列表或表格。
