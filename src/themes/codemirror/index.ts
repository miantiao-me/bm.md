import type { Extension } from '@codemirror/state'
import type { AyuPalette } from '../palette'
import { tags as t } from '@lezer/highlight'
import { createTheme } from '@uiw/codemirror-themes'
import { ayuMirage as darkColors, ayuLight as lightColors } from '../palette'

/**
 * 统一的高亮规则
 */
function createHighlightStyles(colors: AyuPalette) {
  return [
    // 关键字
    { tag: t.keyword, color: colors.keyword },
    { tag: [t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: colors.keyword },

    // 名称与标识符
    { tag: [t.name, t.deleted, t.character, t.macroName], color: colors.fg },
    { tag: [t.function(t.variableName), t.labelName], color: colors.function },
    { tag: [t.definition(t.name), t.separator], color: colors.fg },
    { tag: [t.definition(t.variableName)], color: colors.fg },
    { tag: [t.definition(t.propertyName)], color: colors.member },
    { tag: [t.local(t.variableName)], color: colors.fg },
    { tag: [t.constant(t.variableName)], color: colors.number },

    // 类型与类
    {
      tag: [
        t.typeName,
        t.className,
        t.number,
        t.changed,
        t.annotation,
        t.modifier,
        t.self,
        t.namespace,
      ],
      color: colors.type,
    },

    // 字面量
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.number },
    { tag: [t.atom, t.bool, t.null, t.special(t.variableName)], color: colors.number },
    { tag: [t.integer, t.float], color: colors.number },
    { tag: [t.unit], color: colors.number },
    { tag: [t.processingInstruction, t.string, t.inserted, t.docString], color: colors.string },

    // 运算符
    { tag: [t.operator, t.operatorKeyword], color: colors.operator },
    {
      tag: [
        t.arithmeticOperator,
        t.logicOperator,
        t.bitwiseOperator,
        t.compareOperator,
        t.updateOperator,
        t.definitionOperator,
        t.typeOperator,
        t.controlOperator,
        t.derefOperator,
      ],
      color: colors.operator,
    },

    // 标点与括号
    { tag: [t.punctuation], color: colors.fg },
    { tag: [t.bracket, t.paren, t.brace, t.squareBracket, t.angleBracket], color: colors.fg },

    // 正则与特殊字符串
    { tag: [t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.regex },

    // 注释
    { tag: [t.meta, t.comment, t.lineComment, t.blockComment, t.docComment], color: colors.fgComment, fontStyle: 'italic' },
    { tag: [t.documentMeta], color: colors.fgComment },

    // Markdown 内容
    { tag: t.heading, fontWeight: 'bold', color: colors.keyword },
    { tag: [t.heading1, t.heading2], fontWeight: 'bold', color: colors.keyword },
    { tag: [t.heading3, t.heading4], fontWeight: 'bold', color: colors.keyword },
    { tag: [t.heading5, t.heading6], fontWeight: 'bold', color: colors.keyword },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: colors.info, textDecoration: 'underline' },
    { tag: [t.content], color: colors.fg },
    { tag: [t.list, t.quote], color: colors.fg },
    { tag: [t.monospace], color: colors.string },
    { tag: [t.contentSeparator], color: colors.fgMuted },

    // 错误与其他
    { tag: t.invalid, color: colors.error },
    { tag: [t.propertyName], color: colors.member },
    { tag: [t.attributeName, t.attributeValue], color: colors.decorator },
    { tag: [t.tagName], color: colors.tag },
  ]
}

/**
 * 创建 Ayu 主题
 */
function createAyuTheme(colors: AyuPalette, isDark: boolean): Extension {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? colors.bg : colors.bgSecondary,
      foreground: colors.fg,
      caret: colors.cursor,
      selection: colors.selection,
      selectionMatch: `${colors.modified}33`,
      lineHighlight: colors.activeLine,
      gutterBackground: isDark ? colors.bg : colors.bgSecondary,
      gutterForeground: colors.fg,
      gutterBorder: 'transparent',
    },
    styles: createHighlightStyles(colors),
  })
}

export const ayuLight: Extension = createAyuTheme(lightColors, false)
export const ayuMirage: Extension = createAyuTheme(darkColors, true)

export { ayuLight as ayuLightTheme, ayuMirage as ayuMirageTheme }

/**
 * Get CodeMirror theme extension based on color mode
 */
export function getAyuCodeMirrorTheme(mode: 'light' | 'dark'): Extension {
  return mode === 'light' ? ayuLight : ayuMirage
}
