import type * as exec from '@actions/exec'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import { cyan, green, yellow } from 'kolorist'
import { isDebug } from './config.js'
import { execCommand, exist, installBun, logDebug, renderTemplates, tmpdir, writeTemplates } from './utils.js'

async function run(): Promise<void> {
  try {
    // Check if the action environment is `nodejs`, otherwise it's `composite`
    // @ts-expect-error MY_BUILD_MODE is a custom environment variable
    const buildMode = MY_BUILD_MODE

    const isBuildNode = buildMode === 'node'
    const script = core.getInput('script', { required: true })
    const packages = core.getMultilineInput('packages', { required: false }) || ''
    const autoInstall = core.getInput('auto_install', { required: false }) === 'true'
    // const silent = core.getInput('silent', { required: false }) === 'true'

    const enableBun = isBuildNode ? core.getInput('bun', { required: false }) === 'true' : true
    const enableZx = isBuildNode ? core.getInput('zx', { required: false }) === 'true' : false

    logDebug(`Mode(node/bun): ${isBuildNode ? green('node') : green('bun')}`)
    let bunFile: string = 'bun'

    if (enableBun) {
      isBuildNode && (bunFile = await installBun())
      logDebug(`Runner: ${green('bun')} with bin ${cyan(bunFile)}`)
      // Set environment variable for bun, process.env.BUN is true
      process.env.BUN = 'true'
    }
    else {
      logDebug(`Runner: ${green('tsx')}`)
    }

    const tmpDir = await tmpdir()
    const moduleDir = path.join(tmpDir, 'node_modules')
    const mainFile = path.join(tmpDir, 'src', 'index.ts')
    logDebug(`Directory: ${cyan(tmpDir)}`)

    // const normalizePath = (p: string) => p.split(path.sep).join('/')
    const execRun = async (command: string, args?: string[], options?: exec.ExecOptions): Promise<any> => {
      return await execCommand(command, args, { cwd: tmpDir, ...options })
    }

    // Handle auto install
    if (enableBun && autoInstall) {
      core.info(yellow('auto_install is enabled, deleting node_modules directory'))
      // Only deleting the `node_modules` directory can ensure triggering bun's automatic installation
      await exist(moduleDir) && await fs.rm(moduleDir, { recursive: true })
    }
    else {
      // Handle packages
      // e.g. packages: zod, axios, typescript zx
      const defaultPackages = ['@actions/core', '@actions/exec']
      !enableBun && defaultPackages.push('tsx', 'zx')
      const newPackages = [
        ...(packages?.length === 1 ? packages[0].split(/[,\s]+/g) : packages),
        ...defaultPackages,
      ]
      if (newPackages?.length) {
        const installer = enableBun ? bunFile : 'npm'
        logDebug(`Use ${cyan(installer)} to install packages ${cyan(newPackages.join(', '))}`)
        const execResult = await execRun(installer, ['install', ...newPackages], { silent: true })
        await core.group('Install Packages', async () => core.info(execResult))
      }
      else {
        logDebug(yellow('No packages need to install'))
      }
    }

    // Handle script
    const newScript = script
      // Replace ^# to //
      .replace(/^#/gm, '//')

    await core.group('Input Script', async () => core.info(newScript))

    const tplPath = await writeTemplates()
    isDebug && core.startGroup('Templates')
    await renderTemplates(tplPath, tmpDir, { script: newScript, bun: enableBun, zx: enableZx })
    isDebug && core.endGroup()

    await core.group('Output Script', async () => core.info(await fs.readFile(mainFile, 'utf-8')))
    core.info('Run script...\n\n')

    // Run script
    if (enableBun) {
      await execRun(`${bunFile} run -i ${mainFile}`, [], { silent: false })
    }
    else {
      const tsxCli = path.join(moduleDir, 'tsx', 'dist', 'cli.mjs')
      const nodePath = process.execPath // 获取 node 可执行文件路径

      if (!(await exist(tsxCli))) {
        core.setFailed(`tsx CLI not found at: ${tsxCli}`)
        return
      }
      await execRun(nodePath, [tsxCli, mainFile], { silent: false })
    }

    core.setOutput('status', 'success')
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

run()
