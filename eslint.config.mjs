import js from '@eslint/js'
import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'out/',
      'release/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'coverage/',
      '.npm-cache/'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    plugins: {
      react: reactPlugin
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'react/no-unknown-property': 'off',
      'react/prop-types': 'off'
    }
  },
  {
    files: [
      '**/*.cjs',
      'scripts/**/*.js',
      'electron-builder.config.cjs',
      'src/main/utils/logger.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx'
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  prettierConfig
)
