import type * as exec from '@actions/exec'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as core from '@actions/core'
import { cyan, green, yellow } from 'kolorist'
import { isAct } from './config.js'
import { execCommand, installBun, renderTemplates, tmpdir } from './utils.js'

async function run(): Promise<void> {
  try {
    // Check if the action environment is `nodejs`, otherwise it's `composite`
    // @ts-expect-error MY_BUILD_MODE is a custom environment variable
    const buildMode = MY_BUILD_MODE

    const isBuildNode = buildMode === 'node'
    const script = core.getInput('script', { required: true })
    const packages = core.getMultilineInput('packages', { required: false }) || ''
    const autoInstall = core.getInput('auto_install', { required: false }) === 'true'
    const silent = core.getInput('silent', { required: false }) === 'true'

    const enableBun = isBuildNode ? core.getInput('bun', { required: false }) === 'true' : true
    const enableZx = isBuildNode ? core.getInput('zx', { required: false }) === 'true' : false

    core.info(`Mode: ${isBuildNode ? green('node') : green('bun')}`)
    let bunFile: string = 'bun'

    if (enableBun) {
      core.info(`Runner: ${green('bun')}`)
      isBuildNode && (bunFile = await installBun())
      core.info(`Bun: ${cyan(bunFile)}`)
    }
    else {
      core.info(`Runner: ${green('tsx')}`)
    }

    const tmpDir = await tmpdir()
    const moduleDir = path.join(tmpDir, 'node_modules')
    const mainFile = path.join(tmpDir, 'src', 'index.ts')
    core.info(`Directory: ${cyan(tmpDir)}`)

    const normalizePath = (p: string) => p.split(path.sep).join('/')
    const execRun = async (command: string, args?: string[], options?: exec.ExecOptions): Promise<any> => {
      return await execCommand(command, args, { cwd: tmpDir, ...options })
    }

    // Handle auto install
    if (enableBun && autoInstall) {
      core.info('auto_install is enabled, deleting node_modules directory')
      // Only deleting the `node_modules` directory can ensure triggering bun's automatic installation
      const existModuleDir = await fs.access(moduleDir).then(() => true).catch(() => false)
      existModuleDir && await fs.rm(moduleDir, { recursive: true })
    }
    else {
      // Handle external packages
      await fs.mkdir(moduleDir, { recursive: true })
      core.info('Extracting tarball to node_modules')
      const gzFile = normalizePath(path.join('./public', 'tsx.tar.gz'))
      const targetDir = normalizePath(moduleDir)
      const resultTar = await execCommand(`tar -zxvf ${gzFile} -C ${targetDir}`, [], { silent: true })
      !isAct && await core.group('Extract Details', async () => core.info(resultTar))

      const pkgFile = path.join(moduleDir, 'package.json')
      const pkgLockFile = path.join(moduleDir, 'package-lock.json')
      await execCommand(`mv ${pkgFile} ${pkgLockFile} ${tmpDir}`, [], { silent: true })

      // Handle packages
      // e.g. packages: zod, axios, typescript zx
      const newPackages = packages?.length === 1 ? packages[0].split(/[,\s]+/g) : packages
      if (newPackages?.length) {
        const installer = enableBun ? bunFile : 'npm'
        core.info(`Use ${yellow(installer)} to install packages ${yellow(newPackages.join(', '))}`)
        await execRun(installer, ['install', ...newPackages], { silent })
      }
      else {
        core.info(yellow('No packages need to install'))
      }
    }

    // Handle script
    const newScript = script
    await core.group('Script', async () => core.info(newScript))
    core.startGroup('Templates')
    await renderTemplates('templates', tmpDir, {
      script: newScript,
      bun: enableBun,
      zx: enableZx,
    })
    core.endGroup()

    await core.group('Content', async () => core.info(await fs.readFile(mainFile, 'utf-8')))

    // Run script
    if (enableBun) {
      await execRun(`${bunFile} run -i ${mainFile}`, [], { silent })
    }
    else {
      const tsxCli = path.join(moduleDir, 'tsx', 'dist', 'cli.mjs')
      await execRun(`${tsxCli} ${mainFile}`, [], { silent })
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
