/**
 * Vitest 工作区配置
 * 仅包含 admin-web，排除 miniapp-client（其 vite.config 依赖 @uni-ku/bundle-optimizer 的 ROOT_DIR，在非 uni 环境下未设置会报错）
 */
export default ['apps/admin-web'];
