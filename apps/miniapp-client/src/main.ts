import { createSSRApp } from 'vue'
import App from './App.vue'
import { requestInterceptor } from './http/interceptor'
import { routeInterceptor } from './router/interceptor'

import store from './store'
import '@/style/index.scss'
import 'virtual:uno.css'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)
  app.use(requestInterceptor)

  // 全局 mixin：每个页面 onShow 时触发事件，用于用户协议弹窗检测
  app.mixin({
    onShow() {
      uni.$emit('page-show')
    }
  })

  return {
    app,
  }
}
