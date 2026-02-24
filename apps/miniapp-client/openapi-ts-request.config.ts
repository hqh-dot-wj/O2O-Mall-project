import { defineConfig } from 'openapi-ts-request'

export default defineConfig([
  {
    describe: 'client-api',
    schemaPath: '../../apps/backend/public/openApi.json',
    serversPath: './src/service',
    requestLibPath: `import request from '@/http/vue-query';\n import { CustomRequestOptions_ } from '@/http/types';`,
    requestOptionsType: 'CustomRequestOptions_',
    isGenReactQuery: false,
    reactQueryMode: 'vue',
    isGenJavaScript: false,
  },
])
