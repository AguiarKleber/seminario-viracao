// Dois mundos. Os scripts clássicos do site rodam no navegador, sem módulos,
// porque o modo offline abre por file://. As ferramentas (bin/, test/, e2e/)
// rodam no Node, com módulos ES. Misturar os globais dos dois deixaria passar um
// `process` no telão ou um `document` no simulador.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'vendor/', 'saidas/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser, Viracao: 'writable', qrcode: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, Viracao: 'writable' },
    },
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }],
    },
  },
];
