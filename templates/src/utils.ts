import * as core from '@actions/core'
import * as exec from '@actions/exec'
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
 * Create a log logger
 * @param ns namespace
 * @returns
 */
export function createLogger(ns: string) {
  return (msg: string) => core.info(`#${ns}: ${msg}`)
}

/**
 * Set the output value
 * @param key 
 * @param value 
 */
export function output(key: string, value: any) {
  core.setOutput(key, value)
}

/**
 * Set the output value from an object
 * @param obj 
 */
export function outputJson(obj: Record<string, any>) {
  Object.entries(obj).forEach(([key, value]) => output(key, value))
}
