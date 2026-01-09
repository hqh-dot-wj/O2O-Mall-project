#!/usr/bin/env node

/**
 * 后端服务部署脚本
 * 功能：
 * 1. 打包后端项目 (NestJS)
 * 2. 压缩构建产物和必要文件
 * 3. 上传到服务器
 * 4. 在服务器安装依赖并重启服务
 * 
 * 使用方法：
 * node deploy.cjs [env]
 * 例如：node deploy.cjs prod
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const compressing = require('compressing');

// 项目根目录（脚本在 scripts 目录中，需要访问上一级目录）
const projectRoot = path.resolve(__dirname, '..');

// 读取配置文件
const deployConfig = require('./deploy.config.cjs');

// 获取命令行参数
const env = process.argv[2] || 'prod';
const config = deployConfig[env];

if (!config) {
  console.log(chalk.red(`❌ 未找到 ${env} 环境配置`));
  console.log(chalk.yellow('可用环境：'), Object.keys(deployConfig).join(', '));
  process.exit(1);
}

const conn = new Client();
let spinner;

// 格式化时间
function formatTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

// 执行本地命令
function execCommand(command, description) {
  spinner = ora(description).start();
  try {
    execSync(command, { stdio: 'inherit', cwd: projectRoot });
    spinner.succeed(chalk.green(`✓ ${description}`));
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`✗ ${description} 失败`));
    console.error(error);
    return false;
  }
}

// 执行远程命令
function execRemoteCommand(command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }

      let stdout = '';
      let stderr = '';

      stream
        .on('close', (code) => {
          if (code !== 0 && stderr) {
            // 某些命令即使失败也返回 0，所以这里不严格检查
            console.log(chalk.yellow(`⚠ Command exited with code ${code}`));
          }
          resolve(stdout);
        })
        .on('data', (data) => {
          stdout += data.toString();
        })
        .stderr.on('data', (data) => {
          stderr += data.toString();
        });
    });
  });
}

// 上传文件到服务器
function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) {
        reject(err);
        return;
      }

      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// 检查文件/目录是否存在
function checkExists(filePath) {
  return fs.existsSync(filePath);
}

// 主部署流程
async function deploy() {
  console.log(chalk.blue('='.repeat(60)));
  console.log(chalk.blue(`🚀 开始部署后端服务到 ${config.name}`));
  console.log(chalk.blue('='.repeat(60)));
  console.log('');

  // 1. 清理旧的构建产物
  console.log(chalk.cyan('🧹 步骤 1: 清理旧的构建产物'));
  const distPath = path.join(projectRoot, 'dist');
  if (fs.existsSync(distPath)) {
    execCommand('rm -rf dist', '正在清理旧的构建产物...');
  } else {
    console.log(chalk.gray('  ℹ 没有需要清理的文件'));
  }

  // 2. 构建项目
  console.log('');
  console.log(chalk.cyan('🔨 步骤 2: 构建后端项目'));
  const buildSuccess = execCommand(
    'pnpm run build:prod',
    '正在构建后端项目...'
  );

  if (!buildSuccess) {
    console.log(chalk.red('构建失败，部署终止'));
    process.exit(1);
  }

  // 3. 检查必要文件
  console.log('');
  console.log(chalk.cyan('📋 步骤 3: 检查必要文件'));
  const requiredFiles = [
    'dist',
    'prisma',
    'package.json',
    'scripts/ecosystem.config.cjs',
    'public'
  ];

  const missingFiles = [];
  requiredFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (!checkExists(filePath)) {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    console.log(chalk.red(`❌ 缺少必要文件: ${missingFiles.join(', ')}`));
    process.exit(1);
  }
  console.log(chalk.green('✓ 所有必要文件检查完成'));

  // 4. 创建临时目录并复制文件
  console.log('');
  console.log(chalk.cyan('📦 步骤 4: 准备部署文件'));
  spinner = ora('正在准备文件...').start();

  const tempDir = path.join(projectRoot, '.deploy-temp');
  if (fs.existsSync(tempDir)) {
    execSync(`rm -rf ${tempDir}`, { cwd: projectRoot });
  }
  fs.mkdirSync(tempDir);

  try {
    // 复制 dist 目录的内容到临时目录根部
    execSync(`cp -r dist/* ${tempDir}/`, { cwd: projectRoot });

    // 复制其他必要文件到临时目录
    execSync(`cp -r prisma ${tempDir}/`, { cwd: projectRoot });
    execSync(`cp -r public ${tempDir}/`, { cwd: projectRoot });
    execSync(`cp package.json ${tempDir}/`, { cwd: projectRoot });
    execSync(`cp pnpm-lock.yaml ${tempDir}/`, { cwd: projectRoot, stdio: 'ignore' });
    execSync(`cp scripts/ecosystem.config.cjs ${tempDir}/`, { cwd: projectRoot });

    // 如果配置了复制 .env 文件，根据环境选择对应的 .env 文件
    if (config.includeEnvFile) {
      const envFile = env === 'prod' ? '.env.production' : `.env.${env}`;
      const defaultEnv = '.env';

      // 优先使用环境特定的文件，否则使用默认的 .env
      // 始终重命名为 .env 上传到服务器（避免服务器上同时存在两个文件）
      if (checkExists(path.join(projectRoot, envFile))) {
        execSync(`cp ${envFile} ${tempDir}/.env`, { cwd: projectRoot });
        console.log(chalk.gray(`  使用环境文件: ${envFile} -> .env`));
      } else if (checkExists(path.join(projectRoot, defaultEnv))) {
        execSync(`cp ${defaultEnv} ${tempDir}/.env`, { cwd: projectRoot });
        console.log(chalk.gray(`  使用环境文件: ${defaultEnv}`));
      } else {
        console.log(chalk.yellow(`  ⚠ 未找到环境文件，将不包含 .env`));
      }
    }

    spinner.succeed(chalk.green('✓ 文件准备完成'));
  } catch (error) {
    spinner.fail(chalk.red('✗ 文件准备失败'));
    console.error(error);
    process.exit(1);
  }

  // 5. 压缩文件
  console.log('');
  console.log(chalk.cyan('📦 步骤 5: 压缩部署文件'));
  const zipFileName = `server_deploy_${formatTime()}.tar.gz`;
  const zipFilePath = path.join(projectRoot, zipFileName);

  spinner = ora('正在压缩文件...').start();
  try {
    await compressing.tgz.compressDir(tempDir, zipFilePath);

    // 清理临时目录
    execSync(`rm -rf ${tempDir}`, { cwd: projectRoot });

    const stats = fs.statSync(zipFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    spinner.succeed(chalk.green(`✓ 文件压缩完成 (${fileSizeMB} MB)`));
  } catch (error) {
    spinner.fail(chalk.red('✗ 文件压缩失败'));
    console.error(error);
    execSync(`rm -rf ${tempDir}`, { cwd: __dirname });
    process.exit(1);
  }

  // 6. 连接服务器
  console.log('');
  console.log(chalk.cyan('🔗 步骤 6: 连接服务器'));
  spinner = ora(`正在连接 ${config.host}:${config.port}...`).start();

  const connectionConfig = {
    host: config.host,
    port: config.port,
    username: config.username,
    readyTimeout: 20000,
  };

  // 优先使用私钥，其次使用密码
  if (config.privateKey) {
    connectionConfig.privateKey = fs.readFileSync(config.privateKey);
    if (config.passphrase) {
      connectionConfig.passphrase = config.passphrase;
    }
  } else if (config.password) {
    connectionConfig.password = config.password;
  } else {
    spinner.fail(chalk.red('✗ 未配置登录凭证（密码或私钥）'));
    fs.unlinkSync(zipFilePath);
    process.exit(1);
  }

  conn
    .on('ready', async () => {
      spinner.succeed(chalk.green('✓ 服务器连接成功'));

      try {
        // 7. 备份旧文件
        if (config.isBackup) {
          console.log('');
          console.log(chalk.cyan('💾 步骤 7: 备份旧文件'));
          spinner = ora('正在备份...').start();

          const backupFileName = `backup_${formatTime()}.tar.gz`;
          const backupFullPath = `${config.backupPath}/${backupFileName}`;

          try {
            // 创建备份目录
            await execRemoteCommand(`mkdir -p ${config.backupPath}`);

            // 检查远程目录是否存在且有内容
            const checkCmd = `[ -d "${config.remotePath}" ] && [ "$(ls -A ${config.remotePath} 2>/dev/null)" ] && echo "exists" || echo "empty"`;
            const checkResult = await execRemoteCommand(checkCmd);

            if (checkResult.trim() === 'exists') {
              // 备份现有文件
              await execRemoteCommand(
                `cd ${config.remotePath} && tar -czf ${backupFullPath} . 2>/dev/null || true`
              );

              // 只保留最近的 N 个备份
              const keepBackups = config.keepBackups || 5;
              await execRemoteCommand(
                `cd ${config.backupPath} && ls -t backup_*.tar.gz 2>/dev/null | tail -n +${keepBackups + 1} | xargs -r rm -f`
              );

              spinner.succeed(chalk.green('✓ 备份完成'));
            } else {
              spinner.info(chalk.yellow('⚠ 远程目录为空，跳过备份'));
            }
          } catch (error) {
            spinner.warn(chalk.yellow('⚠ 备份失败，继续部署'));
            console.error(chalk.gray(`  ${error.message}`));
          }
        }

        // 8. 上传压缩包
        console.log('');
        console.log(chalk.cyan('📤 步骤 8: 上传文件到服务器'));
        spinner = ora('正在上传...').start();

        const remoteZipPath = `/tmp/${zipFileName}`;
        await uploadFile(zipFilePath, remoteZipPath);

        spinner.succeed(chalk.green('✓ 文件上传完成'));

        // 9. 部署文件
        console.log('');
        console.log(chalk.cyan('📂 步骤 9: 部署文件'));
        spinner = ora('正在部署...').start();

        // 创建远程目录
        await execRemoteCommand(`mkdir -p ${config.remotePath}`);

        // 停止服务（忽略错误）
        spinner.text = '正在停止旧服务...';
        await execRemoteCommand(`pm2 stop ${config.pm2AppName} || true`);

        // 清空目标目录（保留 .env 文件和 logs 目录）
        await execRemoteCommand(
          `cd ${config.remotePath} && find . -mindepth 1 ! -name '.env*' ! -name 'logs' ! -path './logs/*' -exec rm -rf {} + 2>/dev/null || true`
        );

        // 解压文件到目标目录
        await execRemoteCommand(
          `tar -xzf ${remoteZipPath} -C ${config.remotePath} --strip-components=1`
        );

        // 删除临时压缩包
        await execRemoteCommand(`rm -f ${remoteZipPath}`);

        spinner.succeed(chalk.green('✓ 文件部署完成'));

        // 10. 安装依赖
        console.log('');
        console.log(chalk.cyan('📦 步骤 10: 安装依赖'));
        spinner = ora('正在安装依赖...').start();

        try {
          const pnpmPath = config.pnpmPath || 'pnpm';
          // 不使用 --prod，因为需要 devDependencies 中的 prisma CLI
          const installCmd = `cd ${config.remotePath} && ${pnpmPath} install --frozen-lockfile=false`;
          await execRemoteCommand(installCmd);
          spinner.succeed(chalk.green('✓ 依赖安装完成'));
        } catch (error) {
          spinner.warn(chalk.yellow('⚠ 依赖安装可能失败，请检查'));
          console.error(chalk.gray(`  ${error.message}`));
        }

        // 11. 生成 Prisma Client
        console.log('');
        console.log(chalk.cyan('🔧 步骤 11: 生成 Prisma Client'));
        spinner = ora('正在生成 Prisma Client...').start();

        try {
          const pnpmPath = config.pnpmPath || 'pnpm';
          // 由于步骤4已经将 .env.production 重命名为 .env 上传，这里直接生成即可
          const prismaCmd = `cd ${config.remotePath} && ${pnpmPath} exec prisma generate`;
          await execRemoteCommand(prismaCmd);
          spinner.succeed(chalk.green('✓ Prisma Client 生成完成'));
        } catch (error) {
          spinner.warn(chalk.yellow('⚠ Prisma Client 生成可能失败'));
          console.error(chalk.gray(`  ${error.message}`));
        }

        // 12. 运行数据库同步（可选）
        if (config.dbPush) {
          console.log('');
          console.log(chalk.cyan('🗄️  步骤 12: 同步数据库结构'));
          spinner = ora('正在同步数据库...').start();

          try {
            const pnpmPath = config.pnpmPath || 'pnpm';
            const dbPushCmd = `cd ${config.remotePath} && ${pnpmPath} exec prisma db push --accept-data-loss`;
            await execRemoteCommand(dbPushCmd);
            spinner.succeed(chalk.green('✓ 数据库结构同步完成'));
          } catch (error) {
            spinner.warn(chalk.yellow('⚠ 数据库同步失败'));
            console.error(chalk.gray(`  ${error.message}`));
          }
        }

        // 13. 运行数据库迁移（可选，通常不与 dbPush 同时使用）
        if (config.runMigration) {
          console.log('');
          console.log(chalk.cyan('🗄️  步骤 13: 运行数据库迁移'));
          spinner = ora('正在运行数据库迁移...').start();

          try {
            const pnpmPath = config.pnpmPath || 'pnpm';
            const migrateCmd = `cd ${config.remotePath} && ${pnpmPath} run prisma:deploy`;
            await execRemoteCommand(migrateCmd);
            spinner.succeed(chalk.green('✓ 数据库迁移完成'));
          } catch (error) {
            spinner.warn(chalk.yellow('⚠ 数据库迁移失败'));
            console.error(chalk.gray(`  ${error.message}`));
          }
        }

        // 13.5. 运行种子数据（可选，首次部署或需要重置数据时）
        if (config.runSeed) {
          console.log('');
          console.log(chalk.cyan('🌱 步骤 13.5: 导入种子数据'));
          console.log(chalk.yellow('⚠️  警告: 此操作将导入初始数据（菜单、角色等）'));
          spinner = ora('正在导入种子数据...').start();

          try {
            const pnpmPath = config.pnpmPath || 'pnpm';
            // 使用 prisma:seed:only 仅导入数据，不重置数据库
            const seedCmd = `cd ${config.remotePath} && ${pnpmPath} run prisma:seed:only`;
            await execRemoteCommand(seedCmd);
            spinner.succeed(chalk.green('✓ 种子数据导入完成'));
          } catch (error) {
            spinner.warn(chalk.yellow('⚠ 种子数据导入失败'));
            console.error(chalk.gray(`  ${error.message}`));
          }
        }

        // 14. 启动/重启服务
        console.log('');
        console.log(chalk.cyan('🚀 步骤 14: 启动服务'));
        spinner = ora('正在启动服务...').start();

        try {
          // 尝试重启，如果失败则启动新的
          const pm2Cmd = `cd ${config.remotePath} && pm2 reload ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production`;
          await execRemoteCommand(pm2Cmd);

          // 保存 PM2 配置
          await execRemoteCommand('pm2 save');

          spinner.succeed(chalk.green('✓ 服务启动成功'));
        } catch (error) {
          spinner.fail(chalk.red('✗ 服务启动失败'));
          console.error(chalk.gray(`  ${error.message}`));
          throw error;
        }

        // 14. 健康检查（可选）
        if (config.healthCheckUrl) {
          console.log('');
          console.log(chalk.cyan('🏥 步骤 15: 健康检查'));
          spinner = ora('等待服务启动...').start();

          // 等待几秒让服务启动
          await new Promise(resolve => setTimeout(resolve, 5000));

          try {
            const healthCmd = `curl -f ${config.healthCheckUrl} || echo "Health check failed"`;
            const result = await execRemoteCommand(healthCmd);

            if (result.includes('Health check failed')) {
              spinner.warn(chalk.yellow('⚠ 健康检查失败，请手动验证'));
            } else {
              spinner.succeed(chalk.green('✓ 服务运行正常'));
            }
          } catch (error) {
            spinner.warn(chalk.yellow('⚠ 无法执行健康检查'));
          }
        }

        // 16. 清理本地临时文件
        console.log('');
        console.log(chalk.cyan('🧹 步骤 16: 清理本地临时文件'));
        fs.unlinkSync(zipFilePath);
        console.log(chalk.green('✓ 清理完成'));

        // 部署完成
        console.log('');
        console.log(chalk.blue('='.repeat(60)));
        console.log(chalk.green.bold('🎉 部署成功！'));
        console.log(chalk.blue('='.repeat(60)));
        console.log('');
        console.log(chalk.gray('环境：      '), chalk.white(config.name));
        console.log(chalk.gray('服务器：    '), chalk.white(`${config.host}:${config.port}`));
        console.log(chalk.gray('部署路径：  '), chalk.white(config.remotePath));
        console.log(chalk.gray('PM2 应用：  '), chalk.white(config.pm2AppName));
        if (config.healthCheckUrl) {
          console.log(chalk.gray('健康检查：  '), chalk.white(config.healthCheckUrl));
        }
        console.log('');
        console.log(chalk.yellow('💡 提示：'));
        console.log(chalk.gray('  - 查看服务状态: '), chalk.cyan(`ssh ${config.username}@${config.host} "pm2 status"`));
        console.log(chalk.gray('  - 查看日志: '), chalk.cyan(`ssh ${config.username}@${config.host} "pm2 logs ${config.pm2AppName}"`));
        console.log('');

        conn.end();
        process.exit(0);
      } catch (error) {
        if (spinner) {
          spinner.fail(chalk.red('✗ 部署失败'));
        }
        console.error(chalk.red('错误信息：'), error.message);

        // 清理临时文件
        if (fs.existsSync(zipFilePath)) {
          fs.unlinkSync(zipFilePath);
        }

        conn.end();
        process.exit(1);
      }
    })
    .on('error', (err) => {
      spinner.fail(chalk.red('✗ 服务器连接失败'));
      console.error(chalk.red('错误信息：'), err.message);
      console.log('');
      console.log(chalk.yellow('💡 请检查：'));
      console.log(chalk.gray('  1. 服务器地址和端口是否正确'));
      console.log(chalk.gray('  2. SSH 凭证是否正确（密码或私钥）'));
      console.log(chalk.gray('  3. 服务器防火墙是否开放 SSH 端口'));
      console.log(chalk.gray('  4. 网络连接是否正常'));
      console.log('');

      // 清理临时文件
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }

      process.exit(1);
    })
    .connect(connectionConfig);
}

// 执行部署
deploy();
