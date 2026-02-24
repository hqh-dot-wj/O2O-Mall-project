import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    rules: {
      // NestJS 大量使用装饰器和空接口，放宽相关规则
      '@typescript-eslint/no-empty-object-type': 'off',
      // NestJS 依赖注入需要构造函数参数，允许空构造函数
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      // 后端 console 由 logger 替代，但不阻塞开发
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // 测试文件放宽规则
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // 脚本文件放宽
    files: ['scripts/**/*.cjs', 'scripts/**/*.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'scripts/**/*.cjs'],
  },
];
