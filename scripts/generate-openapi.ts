import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { router } from '@/lib/markdown/router'
import { version } from '@/package.json'

const SERVERS = [process.env?.VITE_APP_URL ? `${process.env?.VITE_APP_URL}/api` : undefined, '/api'].filter((s): s is string => Boolean(s))
const OUTPUT_PATH = '../public/api/openapi.json'

async function ensureDirectory(path: string) {
  await mkdir(dirname(path), { recursive: true })
}

async function generateSpec() {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  })

  return generator.generate(router, {
    info: {
      title: 'bm.md API',
      version,
      description: 'OpenAPI specification for the bm.md API.',
    },
    servers: SERVERS?.map(server => ({ url: server })),
  })
}

async function main() {
  const spec = await generateSpec()
  const targetPath = fileURLToPath(new URL(OUTPUT_PATH, import.meta.url))
  const absolutePath = resolve(targetPath)

  await ensureDirectory(absolutePath)
  await writeFile(absolutePath, `${JSON.stringify(spec, null, 2)}\n`)

  console.info(`OpenAPI spec written to ${absolutePath}`)
  console.info(`Server URL set to ${SERVERS.join(' and ')}`)
}

main().catch((error) => {
  console.error('Failed to generate OpenAPI spec:', error)
  process.exit(1)
})
