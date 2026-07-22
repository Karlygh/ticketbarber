// @ts-check
const tseslint = require('typescript-eslint');
const angularPlugin = require('@angular-eslint/eslint-plugin');
const angularTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const templateParser = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  // ── Test / spec files — reglas más permisivas para scaffolding de tests ──
  {
    files: ['src/**/*.spec.ts', 'src/testing/**/*.ts', 'src/types/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-types': 'off',
      'no-console': 'off',
    },
  },

  // ── TypeScript source files ──────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommended],
    plugins: {
      '@angular-eslint': angularPlugin,
    },
    rules: {
      // Prohíbe console.* en producción — usa logger.util.ts en su lugar
      'no-console': 'error',

      // Avisa sobre `any` explícito pero no bloquea
      '@typescript-eslint/no-explicit-any': 'warn',

      // Variables declaradas y no usadas son un bug potencial
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Funciones vacías solo como warning (hay casos válidos en Angular)
      '@typescript-eslint/no-empty-function': 'warn',

      // Angular: nombres de componentes/directivas/pipes en PascalCase
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/use-lifecycle-interface': 'warn',
    },
  },

  // ── Angular HTML templates ───────────────────────────────────────────────
  {
    files: ['src/**/*.html'],
    languageOptions: {
      parser: templateParser,
    },
    plugins: {
      '@angular-eslint/template': angularTemplatePlugin,
    },
    rules: {
      '@angular-eslint/template/no-negated-async': 'warn',
    },
  },

  // ── Archivos excluidos ───────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'functions/**',
      '.angular/**',
      'jest-environment-custom.js',
      'jest.config.js',
    ],
  }
);
