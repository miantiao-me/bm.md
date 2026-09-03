import { describe, expect, it } from 'vitest'
import { renderBuildMarkdown } from './markdown-plugin'

describe('构建期 Markdown 扩展', () => {
  it('与运行时共享图片尺寸和高亮语法', async () => {
    const html = await renderBuildMarkdown('![说明|320x180](/image.png "标题")\n\n==**粗体**==')

    expect(html).toContain('<img src="/image.png" alt="说明" title="标题" width="320" height="180">')
    expect(html).toContain('<mark><strong>粗体</strong></mark>')
  })
})
