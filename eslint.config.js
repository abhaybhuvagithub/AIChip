// Flat config. Deliberately narrow: this catches classes of bug, not style.
// Formatting arguments in a solo project are a tax with no yield.
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: '18.3' } },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      // Vite's JSX transform means React need not be in scope, and prop-types
      // are redundant in a single-author app with no public component API.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // This site is mostly prose. An apostrophe in JSX text is valid and
      // renders correctly; escaping every one would make the copy unreadable
      // in the source for no user-visible benefit.
      'react/no-unescaped-entities': 'off',
      // These are the ones that actually catch bugs here.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
      'eqeqeq': ['error', 'smart'],
      'no-implicit-coercion': 'off',
    },
  },
]
