import { describe, expect, it } from 'vitest'
import { openApiClient } from '../helpers/openapi-client'

interface ApiResult {
  result: string
}

type HandleResult = Awaited<ReturnType<typeof openApiClient.request>>

describe('openapi HTTP 端点', () => {
  function expectMatchedResponse(result: HandleResult) {
    expect(result.matched).toBe(true)

    if (!result.matched) {
      throw new Error('请求未匹配')
    }

    expect(result.response.headers.get('content-type')).toContain('application/json')

    return result.response
  }

  async function readJson<T>(response: Response) {
    return await response.json() as T
  }

  async function postAndReadResult(path: string, body: Record<string, unknown>) {
    const result = await openApiClient.postJson(path, body)
    const response = expectMatchedResponse(result)
    const data = await readJson<ApiResult>(response)

    return { data, response }
  }

  it('渲染 Markdown 为 HTML', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/render', { markdown: '# 标题' })

    expect(response.status).toBe(200)
    expect(data.result).toEqual(expect.any(String))
    expect(data.result).toContain('标题')
    expect(data.result).toMatch(/<h1[\s>]/)
  })

  it.each([undefined, false, true])('渲染端点支持 breaks=%s', async (breaks) => {
    const { data, response } = await postAndReadResult('/api/markdown/render', {
      markdown: '第一行\n第二行',
      ...(breaks === undefined ? {} : { breaks }),
    })
    expect(response.status).toBe(200)
    expect(/<br[\s>]/.test(data.result)).toBe(breaks === true)
  })

  it('接受微信公众号平台和参考标题参数', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/render', {
      markdown: '# 标题\n\n这是一段[参考链接](https://example.com)。',
      platform: 'wechat',
      referenceTitle: '参考资料',
    })

    expect(response.status).toBe(200)
    expect(data.result).toEqual(expect.any(String))
    expect(data.result).toContain('标题')
  })

  it('接受链接相关布尔参数', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/render', {
      markdown: '[官网链接](https://example.com)',
      enableFootnoteLinks: false,
      openLinksInNewWindow: false,
    })

    expect(response.status).toBe(200)
    expect(data.result).toEqual(expect.any(String))
    expect(data.result).toContain('官网链接')
  })

  it('渲染 GFM 代码块和表格', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/render', {
      markdown: [
        '```ts',
        'const count = 1',
        '```',
        '',
        '| 名称 | 数量 |',
        '| --- | --- |',
        '| 苹果 | 1 |',
      ].join('\n'),
    })

    expect(response.status).toBe(200)
    expect(data.result).toContain('<pre')
    expect(data.result).toContain('<code')
    expect(data.result).toContain('<table')
  })

  it('解析 HTML 为 Markdown', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/parse', { html: '<h1>标题</h1><p>正文</p>' })

    expect(response.status).toBe(200)
    expect(data.result).toContain('# 标题')
    expect(data.result).toContain('正文')
  })

  it('解析复杂 HTML 中的链接、列表和代码', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/parse', {
      html: '<article><h2>小标题</h2><p>查看 <a href="https://example.com">链接</a></p><ul><li>第一项</li><li>第二项</li></ul><pre><code>const count = 1</code></pre></article>',
    })

    expect(response.status).toBe(200)
    expect(data.result).toContain('## 小标题')
    expect(data.result).toContain('[链接](https://example.com)')
    expect(data.result).toContain('- 第一项')
    expect(data.result).toContain('- 第二项')
    expect(data.result).toContain('const count = 1')
  })

  it('提取 Markdown 纯文本', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/extract', { markdown: '**加粗** 文本' })

    expect(response.status).toBe(200)
    expect(data.result).toContain('加粗 文本')
    expect(data.result).not.toContain('**')
  })

  it('从复杂 Markdown 提取可读纯文本', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/extract', {
      markdown: [
        '# 标题',
        '',
        '正文 [链接文字](https://example.com) ![图片描述](image.png)',
        '',
        '```ts',
        'const count = 1',
        '```',
      ].join('\n'),
    })

    expect(response.status).toBe(200)
    expect(data.result).toContain('标题')
    expect(data.result).toContain('正文 链接文字')
    expect(data.result).toContain('const count = 1')
    expect(data.result).not.toContain('https://example.com')
    expect(data.result).not.toContain('image.png')
    expect(data.result).not.toContain('![')
    expect(data.result).not.toContain('```')
  })

  it('校验并修复 Markdown', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/lint', { markdown: '#标题' })

    expect(response.status).toBe(200)
    expect(data.result).toContain('# 标题')
  })

  it('修复行尾空格、标题空格和列表格式', async () => {
    const { data, response } = await postAndReadResult('/api/markdown/lint', {
      markdown: '#标题  \n\n- 项目一  \n-  项目二',
    })

    expect(response.status).toBe(200)
    expect(data.result).toContain('# 标题')
    expect(data.result).toContain('- 项目一')
    expect(data.result).toContain('- 项目二')
    expect(data.result).not.toContain('#标题')
    expect(data.result).not.toContain('-  项目二')
  })

  it.each([
    ['render', '/api/markdown/render', { markdown: '' }],
    ['parse', '/api/markdown/parse', { html: '' }],
    ['extract', '/api/markdown/extract', { markdown: '' }],
    ['lint', '/api/markdown/lint', { markdown: '' }],
  ])('空字符串输入仍返回字符串结果：%s', async (_name, path, body) => {
    const { data, response } = await postAndReadResult(path, body)

    expect(response.status).toBe(200)
    expect(data.result).toEqual(expect.any(String))
  })
})
