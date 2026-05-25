const { createCjsPreset } = require('jest-preset-angular/presets');

module.exports = {
  ...createCjsPreset(),
  testEnvironment: '<rootDir>/jest-environment-custom.js',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/environments/**',
    '!src/types/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};