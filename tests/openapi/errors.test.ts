import { describe, expect, it } from 'vitest'
import { MAX_INPUT_SIZE } from '@/lib/markdown/constants'
import { openApiClient } from '../helpers/openapi-client'

interface ErrorResult {
  defined: boolean
  code: string
  status: number
  message: string
  data?: {
    issues?: unknown[]
  }
}

type HandleResult = Awaited<ReturnType<typeof openApiClient.request>>

describe('openapi HTTP 错误响应', () => {
  function expectMatchedResponse(result: HandleResult) {
    expect(result.matched).toBe(true)

    if (!result.matched) {
      throw new Error('请求未匹配')
    }

    return result.response
  }

  async function readJson<T>(response: Response) {
    return await response.json() as T
  }

  async function submitRaw(path: string, body: string, contentType: string) {
    const result = await openApiClient.postRaw(path, body, contentType)

    return expectMatchedResponse(result)
  }

  async function submitJson(path: string, body: Record<string, unknown>) {
    const result = await openApiClient.postJson(path, body)

    return expectMatchedResponse(result)
  }

  it('缺少必填字段时返回 400 和稳定错误结构', async () => {
    const response = await submitJson('/api/markdown/render', {})
    const data = await readJson<ErrorResult>(response)

    expect(response.status).toBe(400)
    expect(data).toMatchObject({
      defined: false,
      code: 'BAD_REQUEST',
      status: 400,
      message: expect.any(String),
    })
    expect(data.data?.issues).toEqual(expect.any(Array))
  })

  it.each([
    ['parse', '/api/markdown/parse'],
    ['extract', '/api/markdown/extract'],
    ['lint', '/api/markdown/lint'],
  ])('缺少必填字段时返回 400：%s', async (_name, path) => {
    const response = await submitJson(path, {})

    expect(response.status).toBe(400)
  })

  it('未注册 HTTP 方法被视为未匹配', async () => {
    const result = await openApiClient.request('/api/markdown/render', { method: 'GET' })

    expect(result.matched).toBe(false)
  })

  it('json 请求体无法解析时返回 400', async () => {
    const response = await submitRaw('/api/markdown/render', '{broken', 'application/json')

    expect(response.status).toBe(400)
  })

  it('字段类型错误时返回 400', async () => {
    const response = await submitJson('/api/markdown/render', { markdown: 123 })

    expect(response.status).toBe(400)
  })

  it('非法枚举值时返回 400', async () => {
    const response = await submitJson('/api/markdown/render', {
      markdown: '# 标题',
      platform: 'invalid',
    })

    expect(response.status).toBe(400)
  })

  it('自定义 CSS 超过长度限制时返回 400', async () => {
    const response = await submitJson('/api/markdown/render', {
      markdown: '# 标题',
      customCss: 'x'.repeat(50001),
    })

    expect(response.status).toBe(400)
  })

  it('验证错误响应不回显提交的 Markdown 和 CSS 内容', async () => {
    const sentinel = 'SHOULD_NOT_APPEAR_IN_RESPONSE'
    const response = await submitJson('/api/markdown/render', {
      markdown: sentinel,
      customCss: `${sentinel}${'x'.repeat(50001)}`,
    })
    const body = await response.text()

    expect(response.status).toBe(400)
    expect(body).not.toContain(sentinel)
  })

  it.each([
    ['referenceTitle'],
    ['footnoteLabel'],
  ])('渲染标题字段超过长度限制时返回 400：%s', async (field) => {
    const response = await submitJson('/api/markdown/render', {
      markdown: '# 标题',
      [field]: 'x'.repeat(51),
    })

    expect(response.status).toBe(400)
  })

  it.each([
    ['render', 'markdown'],
    ['parse', 'html'],
    ['extract', 'markdown'],
    ['lint', 'markdown'],
  ])('%s 输入超过大小限制时返回 400', async (tool, field) => {
    const response = await submitJson(`/api/markdown/${tool}`, {
      [field]: 'x'.repeat(MAX_INPUT_SIZE + 1),
    })

    expect(response.status).toBe(400)
  })

  it('未匹配路径返回未匹配结果', async () => {
    const result = await openApiClient.postJson('/api/not-found', {})

    expect(result.matched).toBe(false)
  })

  it('错误 Content-Type 时不会返回 200', async () => {
    const response = await submitRaw('/api/markdown/extract', '**加粗** 文本', 'text/plain')

    expect(response.status).toBe(400)
  })

  it('cors 预检请求返回允许跨域的响应头', async () => {
    const result = await openApiClient.request('/api/markdown/render', {
      method: 'OPTIONS',
      headers: {
        'origin': 'https://example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    })
    const response = expectMatchedResponse(result)

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com')
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
    expect(response.headers.get('access-control-allow-headers')).toContain('content-type')
  })
})
