import type { Buffer } from 'node:buffer'
import type { PathLike } from 'node:fs'
import fs from 'node:fs/promises'
import { homedir, tmpdir as osTmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import handlebars from 'handlebars'
import { cyan } from 'kolorist'
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
 * OS: win32 | linux | darwin
 */
export async function installBun(): Promise<string> {
  const startTime = performance.now()
  // win32 | linux | darwin
  const os = process.platform.toLowerCase()
  const arch = process.arch.toLowerCase()
  const isWin = os === 'win32'
  core.info(`System: ${cyan(os)} ${cyan(arch)}`)

  // According to the official website, the installation directory is `~/.bun`
  // ~/.bun/bin/bun or C:\Users\runneradmin\.bun\bin\bun.exe
  const installDir = path.join(process.env.BUN_INSTALL || homedir(), '.bun')
  const binDir = path.join(installDir, 'bin')
  const bunFile = path.join(binDir, 'bun')

  core.info(`Set Bun install directory: ${cyan(bunFile)}`)

  if (!isWin) {
    core.info(`Install from shell script <https://bun.sh/install>`)
    await execCommand('curl -fsSL https://bun.sh/install -o /tmp/bun-install.sh')
    await execCommand('bash /tmp/bun-install.sh')
  }
  else {
    core.info(`Install from shell script <https://bun.sh/install.ps1>`)
    await execCommand('powershell -c "irm bun.sh/install.ps1 | iex"')
  }

  const version = await exec.getExecOutput(`${bunFile} --version`, [], { silent: true })
  core.info(`Bun version: ${cyan(version.stdout.trim())}`)
  core.info(`Spend Time: ${cyan(performance.now() - startTime)}ms`)

  return bunFile
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
      core.info(`Render ${cyan(templatePath)} to ${cyan(destPath)}`)
    }
  }
}

export async function tmpdir(dir: string = ''): Promise<string> {
  const random = Math.random().toString(36).substring(2, 15)
  const tmpRandomDir = path.join(osTmpdir(), `ts-${random}`, dir)
  await fs.mkdir(tmpRandomDir, { recursive: true })
  return tmpRandomDir
}

/**
 * Check if the directory exists
 *
 * e.g. true || 'is True' ==> true
 * e.g. false || 'is False' ==> 'is False'
 * e.g. true && 'is True' ==> 'is True'
 * e.g. false && 'is False' ==> false
 */
export async function exist(dir: PathLike, mode?: number): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(dir, mode).then(() => resolve(true)).catch(() => resolve(false))
  })
}
