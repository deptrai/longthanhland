/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@bdsai/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    // Strip .js extension cho relative imports (shared package dùng ESM .js).
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
