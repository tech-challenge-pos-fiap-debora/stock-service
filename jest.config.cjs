const domainCriticalGlobs = [
  'src/stock/domain/services/budget-pricing.ts',
];

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: domainCriticalGlobs,
  coveragePathIgnorePatterns: ['\\.spec\\.ts$'],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 78,
      functions: 80,
      lines: 80,
    },
  },
};
