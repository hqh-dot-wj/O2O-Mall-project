module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/module/marketing/**/*.service.ts',
    '!src/module/marketing/**/*.module.ts',
    '!src/module/marketing/**/*.repository.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testMatch: ['**/test/unit/**/*.spec.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
};
