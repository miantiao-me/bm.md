import { readFile } from 'node:fs/promises'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { describe, expect, it } from 'vitest'
import { MAX_INPUT_SIZE } from '@/lib/markdown/constants'
import { markdownTools } from '@/lib/markdown/definitions'
import { router } from '@/lib/markdown/router'
import { version } from '@/package.json'

const paths = markdownTools.map(tool => `/markdown/${tool.name}`)

interface OpenAPISpec {
  servers?: Array<{ url?: string }>
  paths?: Record<string, PathItem>
}

interface PathItem {
  post?: Operation
}

interface Operation {
  operationId?: string
  summary?: string
  description?: string
  requestBody?: RequestBody
  responses?: Record<string, ResponseObject>
}

interface RequestBody {
  content?: Record<string, MediaTypeObject>
}

interface ResponseObject {
  content?: Record<string, MediaTypeObject>
}

interface MediaTypeObject {
  schema?: unknown
}

type JsonObject = Record<string, unknown>

async function generateSpec() {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  })

  return await generator.generate(router, {
    info: {
      title: 'bm.md API',
      version,
      description: 'OpenAPI specification for the bm.md API.',
    },
    servers: [{ url: '/api' }],
  }) as OpenAPISpec
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getJsonObject(value: unknown, name: string) {
  if (!isJsonObject(value)) {
    throw new Error(`${name} 不是对象`)
  }

  return value
}

function getRequestSchema(operation: Operation) {
  const jsonContent = operation.requestBody?.content?.['application/json']

  return getJsonObject(jsonContent?.schema, '请求 schema')
}

describe('openapi 规范', () => {
  it('只暴露 registry 中的四个 Markdown 工具', async () => {
    const spec = await generateSpec()

    expect(Object.keys(spec.paths ?? {}).sort()).toEqual([...paths].sort())
  })

  it('直接从 router 生成关键路径定义', async () => {
    const spec = await generateSpec()

    for (const path of paths) {
      const operation = spec.paths?.[path]?.post

      expect(operation).toBeDefined()
      expect(operation?.requestBody).toBeDefined()
      expect(operation?.responses?.['200']).toBeDefined()
    }
  })

  it('直接生成的规范声明 API 前缀', async () => {
    const spec = await generateSpec()

    expect(spec.servers?.[0]?.url).toBe('/api')
  })

  it('每个端点包含操作标识、JSON 请求体和 JSON 成功响应', async () => {
    const spec = await generateSpec()

    for (const path of paths) {
      const operation = spec.paths?.[path]?.post

      expect(operation).toBeDefined()
      expect(operation?.operationId ?? operation?.summary ?? operation?.description).toBeTruthy()
      expect(operation?.requestBody?.content).toHaveProperty('application/json')
      expect(operation?.responses?.['200']?.content).toHaveProperty('application/json')
    }
  })

  it('每个成功响应的 JSON schema 包含 result 字段', async () => {
    const spec = await generateSpec()

    for (const path of paths) {
      const operation = spec.paths?.[path]?.post
      const jsonContent = operation?.responses?.['200']?.content?.['application/json']
      const schema = getJsonObject(jsonContent?.schema, '响应 schema')
      const properties = getJsonObject(schema.properties, '响应属性')

      expect(properties).toHaveProperty('result')
    }
  })

  it('渲染端点请求 schema 暴露关键字段、枚举和长度限制', async () => {
    const spec = await generateSpec()
    const operation = spec.paths?.['/markdown/render']?.post

    expect(operation).toBeDefined()

    const schema = getRequestSchema(operation as Operation)
    const properties = getJsonObject(schema.properties, '渲染请求属性')
    const markdown = getJsonObject(properties.markdown, 'markdown 属性')
    const platform = getJsonObject(properties.platform, 'platform 属性')

    expect(markdown.type).toBe('string')
    expect(markdown.maxLength).toBe(MAX_INPUT_SIZE)
    expect(platform.enum).toEqual(['html', 'wechat'])
    expect(properties).toHaveProperty('customCss')
    expect(properties).toHaveProperty('enableFootnoteLinks')
    expect(properties).toHaveProperty('openLinksInNewWindow')
    expect(properties).toHaveProperty('referenceTitle')
    expect(properties).toHaveProperty('footnoteLabel')
    expect(properties.breaks).toMatchObject({ type: 'boolean', default: false })
    expect(schema.required).not.toContain('breaks')
  })

  it('已生成的公开规范包含关键路径', async () => {
    const content = await readFile('public/api/openapi.json', 'utf8')
    const spec = JSON.parse(content) as OpenAPISpec
    const schema = getRequestSchema(spec.paths?.['/markdown/render']?.post as Operation)
    expect(getJsonObject(schema.properties, '渲染请求属性').breaks).toMatchObject({ type: 'boolean', default: false })

    for (const path of paths) {
      expect(spec.paths).toHaveProperty(path)
    }
  })

  it('公开规范与直接生成规范包含同一组关键路径', async () => {
    const publicContent = await readFile('public/api/openapi.json', 'utf8')
    const publicSpec = JSON.parse(publicContent) as OpenAPISpec
    const directSpec = await generateSpec()

    for (const path of paths) {
      expect(publicSpec.paths).toHaveProperty(path)
      expect(directSpec.paths).toHaveProperty(path)
    }
  })
})
