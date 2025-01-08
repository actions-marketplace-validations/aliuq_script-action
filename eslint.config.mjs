import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    jsonc: true,
    yaml: true,
    javascript: true,
    ignores: ['dist', 'node_modules', '.history', 'templates'],
  },
  {
    rules: {
      'antfu/no-top-level-await': 'off',
    },
  },
)
