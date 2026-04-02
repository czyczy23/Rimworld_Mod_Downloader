module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    '@electron-toolkit/eslint-config-ts/recommended',
    'plugin:react/recommended',
    '@electron-toolkit/eslint-config-prettier'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: ['dist/', 'out/', 'release/', 'node_modules/', 'playwright-report/', 'test-results/'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'prettier/prettier': 'off',
    'react/no-unknown-property': 'off',
    'react/prop-types': 'off'
  }
}
