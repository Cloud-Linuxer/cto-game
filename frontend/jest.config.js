/**
 * Jest Configuration
 *
 * Configuration for unit and integration tests
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test environment
  testEnvironment: 'jest-environment-jsdom',

  // Module name mapper (for absolute imports)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Coverage settings
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'store/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/playwright-report/**',
  ],

  // Coverage thresholds
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
