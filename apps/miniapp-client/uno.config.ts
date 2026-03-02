import type {
  Preset,
} from 'unocss'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'

// https://www.npmjs.com/package/@uni-helper/unocss-preset-uni
import { presetUni } from '@uni-helper/unocss-preset-uni'
// @see https://unocss.dev/presets/legacy-compat
import { presetLegacyCompat } from '@unocss/preset-legacy-compat'
import {
  defineConfig,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetUni({
      attributify: false,
    }),
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      collections: {
        // 注册本地 SVG 图标集合, 从本地文件系统加载图标
        // 在 './src/static/my-icons' 目录下的所有 svg 文件将被注册为图标，
        // my-icons 是图标集合名称，使用 `i-my-icons-图标名` 调用
        'my-icons': FileSystemIconLoader(
          './src/static/my-icons',
          // 可选的，你可以提供一个 transform 回调来更改每个图标
          (svg) => {
            let svgStr = svg

            // 如果 SVG 文件未定义 `fill` 属性，则默认填充 `currentColor`, 这样图标颜色会继承文本颜色，方便在不同场景下适配
            svgStr = svgStr.includes('fill="') ? svgStr : svgStr.replace(/^<svg /, '<svg fill="currentColor" ')

            // 如果 svg 有 width, 和 height 属性，将这些属性改为 1em，否则无法显示图标
            svgStr = svgStr.replace(/(<svg.*?width=)"(.*?)"/, '$1"1em"').replace(/(<svg.*?height=)"(.*?)"/, '$1"1em"')

            return svgStr
          },
        ),
      },
    }),
    // TODO: check 是否会有别的影响
    // 处理低端安卓机的样式问题
    // 将颜色函数 (rgb()和hsl()) 从空格分隔转换为逗号分隔，更好的兼容性app端，example：
    // `rgb(255 0 0)` -> `rgb(255, 0, 0)`
    // `rgba(255 0 0 / 0.5)` -> `rgba(255, 0, 0, 0.5)`
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true, // by QQ4群-量子蔷薇
      // @菲鸽 unocss 配置中，建议在 presetLegacyCompat 中添加 legacyColorSpace: true，以去除生成的颜色样式中的 in oklch 关键字，现在发现有些渐变色生成不符合预期
    }) as Preset,
  ],
  transformers: [
    // 启用指令功能：主要用于支持 @apply、@screen 和 theme() 等 CSS 指令
    transformerDirectives(),
    // 启用 () 分组功能
    // 支持css class组合，eg: `<div class="hover:(bg-gray-400 font-medium) font-(light mono)">测试 unocss</div>`
    transformerVariantGroup(),
  ],
  shortcuts: [
    {
      center: 'flex justify-center items-center',
    },
  ],
  // 动态图标需要在这里配置，或者写在vue页面中注释掉
  safelist: ['i-carbon-code', 'i-carbon-home', 'i-carbon-user'],
  rules: [
    [
      'p-safe',
      {
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      },
    ],
    ['pt-safe', { 'padding-top': 'env(safe-area-inset-top)' }],
    ['pb-safe', { 'padding-bottom': 'env(safe-area-inset-bottom)' }],
  ],
  theme: {
    colors: {
      /** 品牌色 — text-primary / bg-primary */
      primary: 'var(--color-brand-primary, #00C250)',
      'primary-light': 'var(--color-brand-light, #E6F8EB)',
      'primary-hover': 'var(--color-brand-hover, #00A642)',
      /** 功能色 — text-error / text-warning / text-price 等 */
      error: 'var(--color-func-error, #FF4D4F)',
      warning: 'var(--color-func-warning, #FF9C00)',
      success: 'var(--color-func-success, #00C250)',
      link: 'var(--color-func-link, #00698E)',
      price: 'var(--color-price, #FF3B30)',
      /** 文字色 — text-ink / text-ink-light / text-ink-lighter */
      ink: 'var(--color-text-primary, #111111)',
      'ink-light': 'var(--color-text-secondary, #666666)',
      'ink-lighter': 'var(--color-text-tertiary, #999999)',
      /** 边框色 — border-line */
      line: 'var(--color-border-default, #E5E5E5)',
      /** 背景色 — bg-fill / bg-surface */
      fill: 'var(--color-bg-body, #F5F5F5)',
      surface: 'var(--color-bg-surface, #FFFFFF)',
    },
    fontSize: {
      /** 字号阶梯 — text-display-lg / text-title-md 等 */
      'display-lg': ['64rpx', { lineHeight: '1.1' }],
      'display-md': ['48rpx', { lineHeight: '1.2' }],
      'title-lg': ['36rpx', { lineHeight: '1.4' }],
      'title-md': ['32rpx', { lineHeight: '1.4' }],
      'body-lg': ['28rpx', { lineHeight: '1.5' }],
      'body-md': ['26rpx', { lineHeight: '1.5' }],
      'caption': ['24rpx', { lineHeight: '1.4' }],
      'micro': ['20rpx', { lineHeight: '1.2' }],
      /** 兼容旧的小字号类名 */
      '2xs': ['20rpx', '28rpx'],
      '3xs': ['18rpx', '26rpx'],
    },
    spacing: {
      /** 8pt 网格间距 — p-space-xs / m-space-lg 等 */
      'space-xs': '8rpx',
      'space-sm': '16rpx',
      'space-md': '24rpx',
      'space-lg': '32rpx',
      'space-xl': '48rpx',
    },
    borderRadius: {
      /** 圆角 — rounded-card / rounded-pill 等 */
      'sm': '8rpx',
      'card': '16rpx',
      'popup': '24rpx',
      'pill': '999rpx',
    },
    boxShadow: {
      'card': '0 4rpx 12rpx rgba(0, 0, 0, 0.04)',
      'popup': '0 -4rpx 24rpx rgba(0, 0, 0, 0.08)',
    },
  },
  // windows 系统会报错：[plugin:unocss:transformers:pre] Cannot overwrite a zero-length range - use append Left or prependRight instead.
  // 去掉下面的就正常了
  // content: {
  //   /**
  //    * 解决小程序报错 `./app.wxss(78:2814): unexpected unexpected at pos 5198`
  //    * 为什么同时使用include和exclude？虽然看起来多余，但同时配置两者是一种常见的 `防御性编程` 做法。
  //      1. 结构变化保障 : 如果未来项目结构发生变化，某些排除目录可能被移动到包含路径下，exclude配置可以确保它们仍被排除
  //      2. 明确性 : 明确列出要排除的目录使配置意图更加清晰
  //      3. 性能优化 : 避免处理不必要的文件，提高构建性能
  //      4. 防止冲突 : 排除第三方库和构建输出目录，避免潜在的CSS冲突
  //    */
  //   pipeline: {
  //     exclude: [
  //       'node_modules/**/*',
  //       'public/**/*',
  //       'dist/**/*',
  //     ],
  //     include: [
  //       './src/**/*',
  //     ],
  //   },
  // },
})
