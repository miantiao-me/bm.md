import type { Buffer } from 'node:buffer'

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'
import * as z from 'zod'

import { markdownTools, renderDefinition } from '../lib/markdown/definitions'
import { buildInput, formatError, handleCommand } from './core'

const tempDirs: string[] = []

interface CliResult {
  exitCode: number
  stderr: string
  stdout: string
}

async function createTempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'bmmd-cli-'))
  tempDirs.push(dir)
  return dir
}

async function createCssInlineLoader() {
  const dir = await createTempDir()
  const antvLayoutShimFile = join(dir, 'antv-layout-shim.mjs')
  const hooksFile = join(dir, 'css-inline-hooks.mjs')
  const registerFile = join(dir, 'css-inline-register.mjs')

  await writeFile(antvLayoutShimFile, `
export class DagreLayout {
  execute(data) { return data }
  layout(data) { return data }
}

export default { DagreLayout }
`)
  await writeFile(hooksFile, `
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const antvLayoutShim = ${JSON.stringify(pathToFileURL(antvLayoutShimFile).href)}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@antv/layout') {
    return { url: antvLayoutShim, shortCircuit: true }
  }

  if (specifier.includes('.css')) {
    const require = createRequire(context.parentURL)
    const resolved = require.resolve(specifier.replace(/\\?.*$/, ''))
    return { url: pathToFileURL(resolved).href + '?inline', shortCircuit: true }
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  if (url.includes('.css')) {
    return { format: 'module', shortCircuit: true, source: 'export default ""' }
  }

  return nextLoad(url, context)
}
`)
  await writeFile(registerFile, `
import { register } from 'node:module'

register(${JSON.stringify(pathToFileURL(hooksFile).href)})
`)

  return pathToFileURL(registerFile).href
}

async function runCli(args: string[], input?: string): Promise<CliResult> {
  const cssInlineLoader = await createCssInlineLoader()

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--import', cssInlineLoader, 'src/cli/index.ts', ...args], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', code => resolve({ exitCode: code ?? 1, stderr, stdout }))

    child.stdin.end(input)
  })
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('cli core', () => {
  const lintTool = markdownTools.find(tool => tool.name === 'lint')
  const extractTool = markdownTools.find(tool => tool.name === 'extract')

  if (!lintTool || !extractTool) {
    throw new Error('缺少 CLI 工具')
  }

  it('格式化 Zod 错误时包含字段路径', () => {
    const schema = z.object({ markdown: z.string() })
    const result = schema.safeParse({ markdown: 123 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(formatError(result.error)).toContain('markdown:')
    }
  })

  it('--fix 需要输入文件', async () => {
    await expect(handleCommand(lintTool, undefined, { fix: true })).rejects.toThrow('--fix 需要提供输入文件')
  })

  it('--fix 不能与 --output 同时使用', async () => {
    await expect(handleCommand(lintTool, 'input.md', { fix: true, output: 'out.md' })).rejects.toThrow('--fix 不能与 --output 同时使用')
  })

  it('customCssFile 内容追加在 inline customCss 后面', async () => {
    const dir = await createTempDir()
    const inputFile = join(dir, 'input.md')
    const cssFile = join(dir, 'style.css')
    await writeFile(inputFile, '# 标题')
    await writeFile(cssFile, '.file { color: red; }')

    const input = await buildInput(renderDefinition, inputFile, {
      customCss: '.inline { color: blue; }',
      customCssFile: cssFile,
    })

    expect(input.customCss).toBe('.inline { color: blue; }\n.file { color: red; }')
  })

  it('执行工具前只校验一次输入', async () => {
    const dir = await createTempDir()
    const inputFile = join(dir, 'input.md')
    const outputFile = join(dir, 'output.txt')
    await writeFile(inputFile, '**正文**')
    const parse = vi.spyOn(extractTool.inputSchema, 'parse')

    await handleCommand(extractTool, inputFile, { output: outputFile })

    expect(parse).toHaveBeenCalledOnce()
    expect(await readFile(outputFile, 'utf8')).toContain('正文')
  })
})

describe('cli entry', () => {
  it.each([{ flags: [] }, { flags: ['--breaks'] }])('render 正确解析换行选项 $flags', async ({ flags }) => {
    const result = await runCli(['render', ...flags], '第一行\n第二行')
    expect(result.exitCode).toBe(0)
    expect(/<br[\s>]/.test(result.stdout)).toBe(flags.length > 0)
  }, 10_000)

  it('无参数时输出 help', async () => {
    const result = await runCli([])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/bmmd|Usage/)
  })

  it('render 输入文件输出 HTML', async () => {
    const dir = await createTempDir()
    const inputFile = join(dir, 'input.md')
    await writeFile(inputFile, '# 集成标题\n')

    const result = await runCli(['render', inputFile])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toMatch(/<h1[\s>]/)
    expect(result.stdout).toContain('集成标题')
  }, 10_000)

  it('extract 支持 stdin 管道', async () => {
    const result = await runCli(['extract'], '# 管道标题\n\n[链接](https://example.com)')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('管道标题')
    expect(result.stdout).toContain('链接')
  })

  it('lint --fix 会原地修复文件', async () => {
    const dir = await createTempDir()
    const inputFile = join(dir, 'input.md')
    const markdown = '段落内容\n# 标题   \n'
    await writeFile(inputFile, markdown)

    const result = await runCli(['lint', inputFile, '--fix'])
    const fixed = await readFile(inputFile, 'utf8')

    expect(result.exitCode).toBe(0)
    expect(fixed).not.toBe(markdown)
    expect(fixed).toContain('段落内容\n\n# 标题')
  })

  it('输入文件不存在时返回非 0 exitCode 和友好 stderr', async () => {
    const dir = await createTempDir()
    const missingFile = join(dir, 'missing.md')

    const result = await runCli(['render', missingFile])

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('bmmd')
  })
})
