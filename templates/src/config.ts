import process from 'node:process'
import * as core from '@actions/core'

/**
 * 是否为调试模式
 */
export const isDebug = core.getInput('debug', { required: false }) === 'true' || core.isDebug()
