/**
 * 部署配置文件模板
 * 
 * 使用说明：
 * 1. 复制此文件为 deploy.config.cjs
 * 2. 填写你的服务器信息
 * 3. 将 deploy.config.cjs 添加到 .gitignore（避免泄露敏感信息）
 * 
 * 认证方式：
 * - 推荐使用 SSH 私钥认证（更安全）
 * - 也可以使用密码认证
 */

module.exports = {
  // 生产环境
  prod: {
    // 环境名称
    name: '生产环境',

    // ========== 服务器连接配置 ==========
    host: 'your-server-ip',              // 服务器 IP 地址，例如：'106.55.138.243'
    port: 22,                             // SSH 端口
    username: 'root',                     // SSH 用户名

    // 方式1: 使用密码认证（简单但不推荐）
    password: '',                         // SSH 密码

    // 方式2: 使用私钥认证（推荐）
    privateKey: '',                       // SSH 私钥路径，例如：'/Users/username/.ssh/id_rsa'
    passphrase: '',                       // 私钥密码（如果私钥有密码保护）

    // ========== 部署路径配置 ==========
    remotePath: '/www/wwwroot/nest-admin-soybean-server',     // 远程部署目录
    backupPath: '/www/wwwroot/nest-admin-soybean-server/backup',  // 备份目录

    // ========== 部署选项 ==========
    isBackup: true,                       // 是否在部署前备份旧文件
    keepBackups: 5,                       // 保留最近 N 个备份
    includeEnvFile: false,                // 是否包含 .env.production 文件（通常已在服务器配置好）
    runMigration: false,                  // 是否运行数据库迁移（谨慎使用）

    // ========== PM2 配置 ==========
    pm2AppName: 'nest_admin_soybean_server',      // PM2 应用名称（需与 ecosystem.config.cjs 一致）

    // ========== 健康检查 ==========
    healthCheckUrl: 'http://localhost:8080/api/health',  // 健康检查 URL（可选）
  },

  // 测试环境
  test: {
    name: '测试环境',
    host: 'your-test-server-ip',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    passphrase: '',
    remotePath: '/www/wwwroot/nest-admin-soybean-server-test',
    backupPath: '/www/wwwroot/nest-admin-soybean-server-test/backup',
    isBackup: true,
    keepBackups: 3,
    includeEnvFile: false,
    runMigration: false,
    pm2AppName: 'nest_admin_soybean_server_test',
    healthCheckUrl: 'http://localhost:8080/api/health',
  },

  // 开发环境
  dev: {
    name: '开发环境',
    host: 'your-dev-server-ip',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    passphrase: '',
    remotePath: '/www/wwwroot/nest-admin-soybean-server-dev',
    backupPath: '/www/wwwroot/nest-admin-soybean-server-dev/backup',
    isBackup: false,                      // 开发环境可以不备份
    keepBackups: 2,
    includeEnvFile: false,
    runMigration: false,
    pm2AppName: 'nest_admin_server_dev',
    healthCheckUrl: 'http://localhost:8080/api/health',
  },
};
