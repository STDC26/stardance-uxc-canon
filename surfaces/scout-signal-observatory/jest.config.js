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
    global: {
      // Orchestration layer (33-state-machine transitions, timeout infrastructure, convenience
      // wrappers) has many structurally-untriggered paths. Global floor reflects this.
      branches: 55,
      functions: 68,
      lines: 65,
      statements: 65,
    },
    // Phase 5.7 new code meets 85%+ per spec
    './src/behaviors/': { statements: 85, lines: 85 },
    './src/governance/': { statements: 85, lines: 85 },
  }
};
