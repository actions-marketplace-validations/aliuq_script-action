import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { tmpdir as osTmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import handlebars from 'handlebars'
import { cyan, yellow } from 'kolorist'
import { isDebug } from './config.js'

/**
 * Execute a command and return the output
 */
export async function execCommand(command: string, args?: string[], options?: exec.ExecOptions): Promise<string> {
  let result = ''
  await exec.exec(command, args, {
    listeners: {
      stdout: (data: Buffer) => {
        result += data.toString()
      },
    },
    silent: !isDebug,
    ...options,
  })
  return result?.trim?.()
}

/**
 * Create a logger
 * @param ns namespace
 */
export function createLogger(ns: string) {
  return (msg: string) => core.info(`#${ns}: ${msg}`)
}

/**
 * Install bun from official site or local file
 */
export async function installBun(): Promise<void> {
  const startTime = performance.now()
  const os = process.platform
  const arch = process.arch
  core.info(`System: ${cyan(os)} ${cyan(arch)}`)

  const fileName = `./public/bun-${os.toLowerCase()}-${arch.toLowerCase()}.zip`

  const existFile = await fs.access(fileName).then(() => true).catch(() => false)
  if (!existFile) {
    core.info(`Install from shell script <https://bun.sh/install>`)
    process.env.BUN_INSTALL = '/usr/local'
    await execCommand('curl -fsSL https://bun.sh/install -o /tmp/bun-install.sh')
    await execCommand('bash /tmp/bun-install.sh')
  }
  else {
    core.info(`Install from local file ${cyan(fileName)}`)
    // /usr/local/bin/bun-linux-x64/
    await execCommand(`unzip -o -j ${fileName} -d /usr/local/bin`)
  }

  const version = await exec.getExecOutput('bun --version', [], { silent: true })
  core.info(`Bun version: ${cyan(version.stdout.trim())}`)
  core.info(`Spend Time: ${cyan(performance.now() - startTime)}ms`)
}

/**
 * Render templates
 * @param templateRoot template root directory
 * @param destRoot destination root directory
 * @param answers answers
 */
export async function renderTemplates(
  templateRoot: string,
  destRoot: string,
  answers: Record<string, any>,
): Promise<void> {
  const existTplRoot = await fs.access(templateRoot).then(() => true).catch(() => false)
  if (!existTplRoot) {
    core.setFailed(`Template directory ${templateRoot} not found`)
    return
  }

  const existDestRoot = await fs.access(destRoot).then(() => true).catch(() => false)
  if (!existDestRoot) {
    await fs.mkdir(destRoot, { recursive: true })
  }

  // read all file names in templateRoot
  const files = await fs.readdir(templateRoot)

  for await (const fileName of files) {
    const templatePath = path.resolve(templateRoot, fileName)
    const destPath = path.resolve(destRoot, fileName)

    // judge if file is folder
    const isDir = (await fs.stat(templatePath)).isDirectory()
    if (isDir) {
      // clone recursively
      await renderTemplates(templatePath, destPath, answers)
    }
    else {
      // read template file
      const templateContent = await fs.readFile(templatePath, 'utf-8')
      const content = handlebars.compile(templateContent)(answers)
      // write to dest file
      await fs.writeFile(destPath, content, 'utf-8')
      isDebug && core.info(`#RenderTemplates ${cyan(templatePath)} to ${cyan(destPath)}`)
    }
  }
}

export async function tmpdir(dir: string = ''): Promise<string> {
  const random = Math.random().toString(36).substring(2, 15)
  const tmpRandomDir = path.join(osTmpdir(), `ts-${random}`, dir)
  await fs.mkdir(tmpRandomDir, { recursive: true })
  return tmpRandomDir
}
