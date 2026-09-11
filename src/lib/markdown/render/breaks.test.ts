import { describe, expect, it } from 'vitest'
import { renderDefinition } from './definition'
import { render } from './html'

describe('软换行渲染', () => {
  it('schema 默认关闭 breaks，并且只接受布尔值', () => {
    expect(renderDefinition.inputSchema.parse({ markdown: '' }).breaks).toBe(false)
    expect(renderDefinition.inputSchema.safeParse({ markdown: '', breaks: 'true' }).success).toBe(false)
  })

  it.each([undefined, false, true])('breaks=%s 控制软换行', async (breaks) => {
    const html = await render({ markdown: '第一行\n第二行', breaks })
    expect(html.includes('<br>')).toBe(breaks === true)
    if (!breaks) {
      expect(html).toContain('第一行\n第二行')
    }
  })

  it.each([false, true])('breaks=%s 保留原生硬换行且不改变代码块', async (breaks) => {
    for (const markdown of ['第一行  \n第二行', '第一行\\\n第二行']) {
      const html = await render({ markdown, breaks })
      expect(html.match(/<br>/g)).toHaveLength(1)
    }
    const markdown = '```text\n第一行\n第二行\n```'
    expect(await render({ markdown, breaks })).toBe(await render({ markdown }))
  })
})
