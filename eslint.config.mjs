import antfu from '@antfu/eslint-config'
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'

export default antfu({
  formatters: true,
  react: true,
  pnpm: false,
  rules: {
    'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
  },
  ignores: [
    '**/*.gen.ts',
    'src/components/ui/**',
    'src/hooks/use-mobile.tsx',
  ],
}, {
  plugins: {
    'better-tailwindcss': eslintPluginBetterTailwindcss,
  },
  settings: {
    'better-tailwindcss': {
      entryPoint: './src/styles.css',
    },
  },
  rules: {
    ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
    'better-tailwindcss/no-unregistered-classes': 'off',
  },
})
