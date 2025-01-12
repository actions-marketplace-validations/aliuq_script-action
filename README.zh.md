# Script Action

一个强大的 GitHub Action，用于在工作流中执行 TypeScript/JavaScript 脚本。支持多运行时（Bun/TSX）、ESM 模块和 ZX 语法。

## ✨ 特性

- 🚀 双运行时支持：可选择使用 Bun 或 TSX 执行脚本
- 📦 智能包管理：支持手动指定或自动安装依赖
- 🔧 ESM 原生支持：完整支持 ES 模块语法
- ⚡ ZX 集成：在非 Bun 模式下支持 Google ZX 语法
- 🌈 跨平台：支持 Windows、macOS 和 Linux

## 🚀 快速开始

### 基础使用

```yaml
- name: Script Action
  uses: aliuq/script-action@v1
  with:
    script: |
      console.log('This is a basic message')
```

### Bun 模式

```yaml
- name: Run with Bun
  uses: aliuq/script-action@v1
  with:
    bun: true
    script: |
      const response = await fetch('https://api.github.com')
      console.log(await response.json())
```

### 自动安装依赖

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

### 使用 ZX 语法

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

### 输出变量

使用 `output` 函数输出变量：

```yaml
- name: Output variables
  id: script
  uses: aliuq/script-action@v1
  with:
    script: |
      output('key', 'value')
```

## 输入参数

| 参数 | 描述 | 必填 | 默认值 |
|------|------|------|--------|
| `script` | 脚本内容 | 是 | - |
| `packages` | 需要安装的额外 npm 包 | 否 | - |
| `bun` | 是否使用 bun 执行脚本 | 否 | "true" |
| `auto_install` | 自动下载依赖包（仅在 bun 模式下有效） | 否 | "false" |
| `zx` | 启用 google/zx 语法（仅在非 bun 模式下有效） | 否 | "true" |
| `debug` | 是否打印调试日志 | 否 | "false" |

## 运行环境

- Node.js 环境：使用 tsx + @actions/core + zx（当 bun=false）
- Bun 环境：使用 bun + @actions/core（当 bun=true）

## 完整示例

更多使用示例请参考 [.github/workflows/ci.yaml](.github/workflows/ci.yaml)。

## 许可证

MIT License
