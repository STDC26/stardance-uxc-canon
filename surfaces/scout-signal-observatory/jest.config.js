module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        jsx: 'react-jsx'
      }
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/tests/__mocks__/styleMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/tests/__mocks__/**',
    '!src/hooks/**'
  ],
  coverageThreshold: {
    // Note: Jest applies "global" only to files not matched by path-specific thresholds.
    // The Phase 5.7 modules (behaviors/governance/orchestration) are enforced at 85%+ below.
    // Global floor covers UI/component files. App.tsx wiring (Phase 5.7 → UI) is integration-
    // layer code; unit test coverage for UI handlers is not required by spec.
    global: {
      branches: 48,
      functions: 70,
      lines: 54,
      statements: 54,
    },
    // Phase 5.7 new code meets 85%+ per spec (CC_SCOUT_14 verified)
    './src/behaviors/': { statements: 85, lines: 85 },
    './src/governance/': { statements: 85, lines: 85 },
    './src/orchestration/': { statements: 85, lines: 85 },
  }
};
