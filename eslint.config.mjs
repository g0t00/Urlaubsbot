import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'client/dist/', 'lib/sheet.ts'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  {
    files: ['lib/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
