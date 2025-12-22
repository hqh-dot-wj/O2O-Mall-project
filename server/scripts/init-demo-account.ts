import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function initDemoAccount() {
  try {
    console.log('🚀 开始初始化演示账户...\n');

    // 1. 清理现有演示数据
    console.log('📝 清理现有演示数据...');
    
    // 查找现有数据
    const existingUser = await prisma.sysUser.findFirst({
      where: { userName: 'demo', tenantId: '000000' }
    });
    
    const existingRole = await prisma.sysRole.findFirst({
      where: { roleKey: 'demo', tenantId: '000000' }
    });

    // 删除用户相关数据
    if (existingUser) {
      console.log(`  - 删除用户岗位关联...`);
      await prisma.sysUserPost.deleteMany({ where: { userId: existingUser.userId } });
      
      console.log(`  - 删除用户角色关联...`);
      await prisma.sysUserRole.deleteMany({ where: { userId: existingUser.userId } });
      
      console.log(`  - 删除演示用户...`);
      await prisma.sysUser.delete({ where: { userId: existingUser.userId } });
      console.log('  ✓ 已删除旧的演示用户');
    }

    // 删除角色相关数据
    if (existingRole) {
      console.log(`  - 删除角色菜单关联...`);
      await prisma.sysRoleMenu.deleteMany({ where: { roleId: existingRole.roleId } });
      
      console.log(`  - 删除演示角色...`);
      await prisma.sysRole.delete({ where: { roleId: existingRole.roleId } });
      console.log('  ✓ 已删除旧的演示角色');
    }
    
    if (!existingUser && !existingRole) {
      console.log('  ✓ 无需清理，数据库中没有演示账户');
    }

    // 2. 创建演示角色
    console.log('\n📝 创建演示角色...');
    const demoRole = await prisma.sysRole.create({
      data: {
        roleName: '演示角色',
        roleKey: 'demo',
        roleSort: 10,
        dataScope: '5',
        status: '0',
        delFlag: '0',
        remark: '演示账户角色，仅拥有查看权限',
        tenantId: '000000',
        createBy: 'admin',
        updateBy: 'admin'
      }
    });
    console.log(`  ✓ 演示角色已创建 (ID: ${demoRole.roleId})`);

    // 3. 分配查询权限
    console.log('\n📝 分配查询权限...');
    
    // 查询所有菜单，然后在内存中过滤
    const allMenus = await prisma.sysMenu.findMany({
      where: {
        tenantId: '000000',
        delFlag: '0',
        status: '0'
      }
    });
    
    // 过滤出查询权限和菜单
    const menus = allMenus.filter(m => 
      !m.perms || 
      m.perms.includes(':list') || 
      m.perms.includes(':query') || 
      m.perms.includes(':export')
    );

    const roleMenuData = menus.map(menu => ({
      roleId: demoRole.roleId,
      menuId: menu.menuId
    }));

    await prisma.sysRoleMenu.createMany({
      data: roleMenuData,
      skipDuplicates: true
    });
    console.log(`  ✓ 已分配 ${menus.length} 个权限`);

    // 4. 创建演示用户
    console.log('\n📝 创建演示用户...');
    const defaultDept = await prisma.sysDept.findFirst({
      where: { tenantId: '000000' },
      orderBy: { deptId: 'asc' }
    });

    // 生成密码哈希 (demo123)
    const passwordHash = await bcrypt.hash('demo123', 10);

    const demoUser = await prisma.sysUser.create({
      data: {
        userName: 'demo',
        nickName: '演示账号',
        userType: '00',
        email: 'demo@example.com',
        phonenumber: '13800138000',
        sex: '0',
        password: passwordHash,
        status: '0',
        delFlag: '0',
        deptId: defaultDept?.deptId || null,
        tenantId: '000000',
        createBy: 'admin',
        updateBy: 'admin',
        remark: '演示账户，密码：demo123'
      }
    });
    console.log(`  ✓ 演示用户已创建 (ID: ${demoUser.userId})`);

    // 5. 分配角色
    console.log('\n📝 分配角色...');
    await prisma.sysUserRole.create({
      data: {
        userId: demoUser.userId,
        roleId: demoRole.roleId
      }
    });
    console.log('  ✓ 用户角色已关联');

    // 6. 分配岗位
    const defaultPost = await prisma.sysPost.findFirst({
      where: { tenantId: '000000' },
      orderBy: { postId: 'asc' }
    });

    if (defaultPost) {
      await prisma.sysUserPost.create({
        data: {
          userId: demoUser.userId,
          postId: defaultPost.postId
        }
      });
      console.log('  ✓ 用户岗位已关联');
    }

    // 7. 验证
    console.log('\n✅ 演示账户初始化完成！\n');
    console.log('='.repeat(50));
    console.log('📋 账户信息：');
    console.log('='.repeat(50));
    console.log(`用户名：demo`);
    console.log(`密码：  demo123`);
    console.log(`租户：  000000`);
    console.log(`角色：  ${demoRole.roleName} (${demoRole.roleKey})`);
    console.log(`权限数：${menus.length} 个（仅查看权限）`);
    console.log('='.repeat(50));

    // 显示部分权限
    const samplePerms = menus
      .filter(m => m.perms)
      .slice(0, 10)
      .map(m => m.perms);
    
    if (samplePerms.length > 0) {
      console.log('\n📌 部分权限示例：');
      samplePerms.forEach(perm => console.log(`  - ${perm}`));
      console.log('  ...');
    }

  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initDemoAccount();
