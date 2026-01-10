import { describe, expect, it } from 'vitest'
import { lint } from './index'

describe('markdown lint and fix', () => {
  it('removes trailing whitespace', async () => {
    const markdown = '这是一行文本   \n第二行'
    const fixed = await lint({ markdown })

    expect(fixed).not.toMatch(/ {2,}\n/)
    expect(fixed).toContain('这是一行文本')
  })

  it('normalizes multiple blank lines to single', async () => {
    const markdown = '段落一\n\n\n\n段落二'
    const fixed = await lint({ markdown })

    expect(fixed).not.toMatch(/\n{4,}/)
    expect(fixed).toContain('段落一')
    expect(fixed).toContain('段落二')
  })

  it('ensures blank line before headings', async () => {
    const markdown = '段落内容\n# 标题'
    const fixed = await lint({ markdown })

    expect(fixed).toMatch(/段落内容\n\n# 标题/)
  })

  it('fixes unordered list marker consistency', async () => {
    const markdown = '* 项目一\n* 项目二\n* 项目三'
    const fixed = await lint({ markdown })

    expect(fixed).toContain('项目一')
    expect(fixed).toContain('项目二')
    expect(fixed).toContain('项目三')
  })

  it('preserves already valid markdown unchanged', async () => {
    const markdown = '# 标题\n\n这是正确格式的段落。\n\n- 列表项一\n- 列表项二\n'
    const fixed = await lint({ markdown })

    expect(fixed).toBe(markdown)
  })

  it('handles empty input', async () => {
    const fixed = await lint({ markdown: '' })
    expect(fixed).toBe('')
  })

  it('preserves code block content', async () => {
    const markdown = '```js\nconst x = 1\n```\n'
    const fixed = await lint({ markdown })

    expect(fixed).toContain('const x = 1')
    expect(fixed).toContain('```')
  })
})
