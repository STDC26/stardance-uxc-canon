module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
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
    // The Phase 5.7 modules (behaviors/governance/orchestration) are all enforced at 85%+
    // below. Global floor covers remaining UI/component files.
    global: {
      branches: 55,
      functions: 74,
      lines: 62,
      statements: 63,
    },
    // Phase 5.7 new code meets 85%+ per spec (CC_SCOUT_14 verified)
    './src/behaviors/': { statements: 85, lines: 85 },
    './src/governance/': { statements: 85, lines: 85 },
    './src/orchestration/': { statements: 85, lines: 85 },
  }
};
