import { describe, expect, it } from 'vitest'
import extract from './text'

describe('markdown -> text extract', () => {
  it('keeps paragraph separation with newlines', async () => {
    const markdown = 'First paragraph.\n\nSecond paragraph.'
    const text = await extract(markdown)

    expect(text).toContain('First paragraph.')
    expect(text).toContain('Second paragraph.')
  })

  it('keeps list items on separate lines', async () => {
    const markdown = '- item one\n- item two'
    const text = await extract(markdown)

    expect(text).toMatch(/item one/)
    expect(text).toMatch(/item two/)
  })

  it('removes markdown formatting while keeping content', async () => {
    const markdown = '**Bold** text with [link](https://example.com).'
    const text = await extract(markdown)

    expect(text).toContain('Bold text with link.')
  })

  it('extracts text from headings', async () => {
    const markdown = '# 一级标题\n\n## 二级标题'
    const text = await extract(markdown)

    expect(text).toContain('一级标题')
    expect(text).toContain('二级标题')
    expect(text).not.toContain('#')
  })

  it('removes image syntax from text', async () => {
    const markdown = '这是一张 ![示例图片](https://example.com/img.png) 图片'
    const text = await extract(markdown)

    expect(text).not.toContain('![')
    expect(text).not.toContain('https://example.com')
  })

  it('extracts text from blockquotes', async () => {
    const markdown = '> 这是一段引用\n>\n> 引用第二行'
    const text = await extract(markdown)

    expect(text).toContain('这是一段引用')
    expect(text).toContain('引用第二行')
    expect(text).not.toContain('>')
  })

  it('extracts code content without fence markers', async () => {
    const markdown = '```javascript\nconst x = 1\n```'
    const text = await extract(markdown)

    expect(text).toContain('const x = 1')
    expect(text).not.toContain('```')
  })

  it('handles empty input', async () => {
    const text = await extract('')
    expect(text).toBe('')
  })

  it('preserves Chinese characters and emoji', async () => {
    const markdown = '你好世界 🎉 **加粗中文**'
    const text = await extract(markdown)

    expect(text).toContain('你好世界')
    expect(text).toContain('🎉')
    expect(text).toContain('加粗中文')
  })
})
