import { URL, fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{spec,test}.{ts,tsx,vue}'],
    exclude: ['node_modules', 'dist', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx,vue}'],
      exclude: [
        'src/main.ts',
        'src/**/*.d.ts',
        'src/**/*.spec.{ts,tsx,vue}',
        'src/**/*.test.{ts,tsx,vue}',
        'src/locales/**',
        'src/typings/**',
      ],
    },
    setupFiles: ['src/test/setup.ts'],
  },
});
