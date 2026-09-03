import { defaultSchema } from 'rehype-sanitize'

/**
 * Sanitize schema for rehype-sanitize
 *
 * 注意：SVG 相关元素不需要在此配置，因为 rehypeMermaid 在 sanitize 之后执行
 */
export const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', 'tel'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'figure',
    'figcaption',
    'mark',
    'section',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
    div: [...(defaultSchema.attributes?.div || []), 'className'],
    section: [...(defaultSchema.attributes?.section || []), 'className'],
    p: [...(defaultSchema.attributes?.p || []), 'className'],
    figure: [...(defaultSchema.attributes?.figure || []), 'className'],
  },
}
