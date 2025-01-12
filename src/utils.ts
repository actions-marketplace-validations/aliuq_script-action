import type { PathLike } from 'node:fs'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { homedir } from 'node:os'
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
  core.startGroup('Install Bun')
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
  core.endGroup()

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
  const existTplRoot = await exist(templateRoot)
  if (!existTplRoot) {
    core.setFailed(`Template directory ${templateRoot} not found`)
    return
  }

  const existDestRoot = await exist(destRoot)
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

/**
 * Write templates to a temporary directory
 * @returns directory path
 */
export async function writeTemplates(): Promise<string> {
  const tplDir = await tmpdir('templates')
  const srcDir = path.join(tplDir, 'src')
  await fs.mkdir(srcDir, { recursive: true })

  const revertFile = (str: string) => Buffer.from(str, 'base64').toString('utf-8')
  // @ts-expect-error TPL_PACKAGE_JSON is a string
  await fs.writeFile(path.join(tplDir, 'package.json'), revertFile(TPL_PACKAGE_JSON), 'utf-8')
  // @ts-expect-error TPL_TSCONFIG_JSON is a string
  await fs.writeFile(path.join(tplDir, 'tsconfig.json'), revertFile(TPL_TSCONFIG_JSON), 'utf-8')
  // @ts-expect-error TPL_SRC_CONFIG_TS is a string
  await fs.writeFile(path.join(srcDir, 'config.ts'), revertFile(TPL_SRC_CONFIG_TS), 'utf-8')
  // @ts-expect-error TPL_SRC_UTILS_TS is a string
  await fs.writeFile(path.join(srcDir, 'utils.ts'), revertFile(TPL_SRC_UTILS_TS), 'utf-8')
  // @ts-expect-error TPL_SRC_INDEX_TS is a string
  await fs.writeFile(path.join(srcDir, 'index.ts'), revertFile(TPL_SRC_INDEX_TS), 'utf-8')

  // 查看模板文件
  await core.group('Template Files', async () => {
    const files = await fs.readdir(tplDir, { recursive: true })
    for await (const file of files) {
      const tempFile = path.join(tplDir, file)
      const isDir = (await fs.stat(tempFile)).isDirectory()
      if (!isDir) {
        const content = await fs.readFile(tempFile, 'utf-8')
        core.info(`Template file: ${cyan(file)}`)
        core.info(content)
        core.info('')
      }
    }
  })

  return tplDir
}

export async function tmpdir(dir = ''): Promise<string> {
  const random = Math.random().toString(36).substring(2, 15)
  const tmpRandomDir = path.join(homedir(), `ts-${random}`, dir)
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
