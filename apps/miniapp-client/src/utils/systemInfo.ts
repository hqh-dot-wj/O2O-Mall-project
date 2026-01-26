/* eslint-disable import/no-mutable-exports */
// 获取屏幕边界到安全区域距离
let systemInfo: any = {}
let safeAreaInsets: any = {}
const phone: any = {}

// #ifdef MP-WEIXIN
// 微信小程序使用新的API
const windowInfo = uni.getWindowInfo()
const appBaseInfo = uni.getAppBaseInfo()
const deviceInfo = uni.getDeviceInfo()

systemInfo = {
  ...windowInfo,
  ...appBaseInfo,
  ...deviceInfo,
}

safeAreaInsets = windowInfo.safeArea
  ? {
    top: windowInfo.safeArea.top,
    right: windowInfo.windowWidth - windowInfo.safeArea.right,
    bottom: windowInfo.windowHeight - windowInfo.safeArea.bottom,
    left: windowInfo.safeArea.left,
  }
  : null
// #endif

// #ifndef MP-WEIXIN
// 其他平台继续使用uni API
systemInfo = uni.getSystemInfoSync()
safeAreaInsets = systemInfo.safeAreaInsets
// #endif

// 组装 phone 对象 (Copying user's requested logic)
phone.StatusBar = systemInfo.statusBarHeight
phone.windowWidth = systemInfo.windowWidth
phone.windowHeight = systemInfo.windowHeight
phone.pixelRatio = systemInfo.pixelRatio
phone.screenWidth = systemInfo.screenWidth
phone.screenHeight = systemInfo.screenHeight
phone.SDKVersion = systemInfo.SDKVersion

// Platform standardization as requested
if (systemInfo.platform === 'devtools') {
  phone.platform = 'android'
}
else if (systemInfo.platform === 'ios') {
  phone.platform = 'IOS'
}
else if (systemInfo.platform === 'android') {
  phone.platform = 'android'
}
else {
  phone.platform = systemInfo.platform // Fallback
}

// CustomBar calculation
// #ifdef MP-WEIXIN
if (uni.getMenuButtonBoundingClientRect) {
  const custom = uni.getMenuButtonBoundingClientRect()
  phone.CustomBar = custom.bottom + custom.top - systemInfo.statusBarHeight
}
else {
  phone.CustomBar = 44 // Default fallback if method missing (though unlikely on modern libs)
}
// #endif

// #ifndef MP-WEIXIN
// Default for other platforms (H5, App) where custom nav bar might not be calculated same way
// Usually 44px (standard header) + status bar. But usually CustomBar refers to the header height.
// User logic specifically asked for the calculation based on MenuButton, which is MP specific.
// We'll set a reasonable default or keep it undefined if not applicable.
phone.CustomBar = systemInfo.statusBarHeight + 44
// #endif

console.log('systemInfo', systemInfo)
console.log('phone', phone)

export { phone, safeAreaInsets, systemInfo }
