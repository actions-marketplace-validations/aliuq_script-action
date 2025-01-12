# Script Action

A powerful GitHub Action for executing TypeScript/JavaScript scripts in workflows. Supports multiple runtimes (Bun/TSX), ESM modules, and ZX syntax.

## ✨ Features

- 🚀 Dual Runtime Support: Execute scripts using either Bun or TSX
- 📦 Smart Package Management: Support for both manual specification and automatic dependency installation
- 🔧 ESM Native Support: Full ES modules syntax compatibility
- ⚡ ZX Integration: Google ZX syntax support in non-Bun mode
- 🌈 Cross-platform: Windows, macOS and Linux support

## 🚀 Quick Start

### Basic Usage

```yaml
- name: Script Action
  uses: aliuq/script-action@v1
  with:
    script: |
      console.log('This is a basic message')
```

### Bun Mode

```yaml
- name: Run with Bun
  uses: aliuq/script-action@v1
  with:
    bun: true
    script: |
      const response = await fetch('https://api.github.com')
      console.log(await response.json())
```

### Auto Install Dependencies

```yaml
- name: Auto install dependencies
  uses: aliuq/script-action@v1
  with:
    bun: true
    auto_install: true
    script: |
      import { Octokit } from 'octokit'
      const octokit = new Octokit()
      const { data } = await octokit.rest.repos.get({
        owner: 'aliuq',
        repo: 'script-action'
      })
      console.log(data)
```

### Using ZX Syntax

```yaml
- name: Use ZX syntax
  uses: aliuq/script-action@v1
  with:
    bun: false
    zx: true
    script: |
      await $`ls -la`
      const files = await glob('**/*.ts')
      console.log('TypeScript files:', files)
```

## Input Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|:--------:|:-------:|
| `script` | Script content to execute | Yes | - |
| `packages` | Additional npm packages to install | No | - |
| `bun` | Use Bun runtime | No | "true" |
| `auto_install` | Auto install dependencies (Bun mode only) | No | "false" |
| `zx` | Enable Google/ZX syntax (non-Bun mode only) | No | "true" |
| `debug` | Enable debug logging | No | "false" |

## Runtime Environment

- Node.js: Using tsx + @actions/core + zx (when bun=false)
- Bun: Using bun + @actions/core (when bun=true)

## Complete Examples

For more usage examples, please refer to [.github/workflows/ci.yaml](.github/workflows/ci.yaml).

## License

MIT License

[中文文档](README.zh.md)
