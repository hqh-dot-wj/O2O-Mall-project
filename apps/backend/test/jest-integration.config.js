module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/module/marketing/**/*.service.ts',
    'src/module/marketing/**/*.controller.ts',
    '!src/module/marketing/**/*.module.ts',
    '!src/module/marketing/**/*.repository.ts',
  ],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testMatch: ['**/test/integration/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000,
};
