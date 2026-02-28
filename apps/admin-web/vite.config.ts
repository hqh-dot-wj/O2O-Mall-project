import process from 'node:process';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { setupVitePlugins } from './build/plugins';
import { createViteProxy, getBuildTime } from './build/config';

const adminWebDir = fileURLToPath(new URL('./', import.meta.url));
const libsDir = path.resolve(adminWebDir, '../../libs');

export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;

  return {
    base: viteEnv.VITE_BASE_URL,
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // 指向 libs 源码，避免 CJS dist 在 Vite ESM 下的互操作问题（子路径须在父路径前）
        '@libs/common-utils/tree': path.join(libsDir, 'common-utils/src/tree.ts'),
        '@libs/common-utils/error': path.join(libsDir, 'common-utils/src/error.ts'),
        '@libs/common-utils': path.join(libsDir, 'common-utils/src/index.ts'),
        '@libs/common-constants/regex': path.join(libsDir, 'common-constants/src/regex.ts'),
        '@libs/common-constants': path.join(libsDir, 'common-constants/src/index.ts')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/styles/scss/global.scss" as *;`
        }
      }
    },
    plugins: setupVitePlugins(viteEnv, buildTime),
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    server: {
      host: '0.0.0.0',
      port: 9527,
      open: true,
      proxy: createViteProxy(viteEnv, enableProxy),
      fs: {
        allow: [adminWebDir, libsDir]
      }
    },
    preview: {
      port: 9725
    },
    build: {
      reportCompressedSize: false,
      sourcemap: viteEnv.VITE_SOURCE_MAP === 'Y',
      commonjsOptions: {
        ignoreTryCatch: false
      }
    },
    optimizeDeps: {
      include: ['@umoteam/editor', '@braintree/sanitize-url']
    }
  };
});
