import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { createLogger, output, outputJson, execCommand } from './utils.js'
{{#if bun }}
import Bun from 'bun'
import { $ } from 'bun'
{{else if zx}}
import 'zx/globals'
{{/if}}

{{{ script }}}
