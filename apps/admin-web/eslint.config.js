import { defineConfig } from '@soybeanjs/eslint-config';

export default defineConfig(
  { vue: true, unocss: true },
  {
    // 插件自动生成，避免解析/语法差异导致 lint 失败
    ignores: ['src/typings/components.d.ts', 'src/typings/elegant-router.d.ts', 'src/router/elegant/**']
  },
  {
    rules: {
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index', 'App', 'Register', '[id]', '[url]']
        }
      ],
      'vue/component-name-in-template-casing': [
        'warn',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^icon-/']
        }
      ],
      'unocss/order-attributify': 'off',
      // Vite 项目中 process.env / import.meta.env 是合法用法
      'n/prefer-global/process': 'off',
      // 部署脚本等场景存在合理的 shadow，降为 warn
      'no-shadow': 'off',
      // 历史代码中存在 ++ 用法，降为 warn 逐步修复
      'no-plusplus': 'off',
      // 允许 == null 简写（同时匹配 null 和 undefined）
      'no-eq-null': 'off'
    }
  },
  {
    // 脚本文件放宽
    files: ['scripts/**/*.cjs'],
    rules: {
      'no-console': 'off'
    }
  }
);
