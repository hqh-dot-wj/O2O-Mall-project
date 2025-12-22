-- =============================================
-- 演示账户初始化脚本 (PostgreSQL - 简化版)
-- 功能：创建演示角色和演示账户（仅查看权限）
-- 日期：2025-12-22
-- =============================================

-- 完全清理现有演示数据
DO $$
DECLARE
  v_demo_user_id INT;
  v_demo_role_id INT;
BEGIN
  -- 获取演示用户ID
  SELECT user_id INTO v_demo_user_id FROM sys_user WHERE user_name = 'demo' AND tenant_id = '000000';
  
  -- 获取演示角色ID
  SELECT role_id INTO v_demo_role_id FROM sys_role WHERE role_key = 'demo' AND tenant_id = '000000';
  
  -- 删除用户关联
  IF v_demo_user_id IS NOT NULL THEN
    DELETE FROM sys_user_post WHERE user_id = v_demo_user_id;
    DELETE FROM sys_user_role WHERE user_id = v_demo_user_id;
    DELETE FROM sys_user WHERE user_id = v_demo_user_id;
  END IF;
  
  -- 删除角色关联
  IF v_demo_role_id IS NOT NULL THEN
    DELETE FROM sys_role_menu WHERE role_id = v_demo_role_id;
    DELETE FROM sys_role WHERE role_id = v_demo_role_id;
  END IF;
END $$;

-- 1. 创建演示角色
INSERT INTO sys_role (
  role_name, 
  role_key, 
  role_sort, 
  data_scope, 
  status, 
  del_flag, 
  remark,
  tenant_id,
  create_time,
  update_time,
  create_by,
  update_by
) VALUES (
  '演示角色',
  'demo',
  10,
  '5',
  '0',
  '0',
  '演示账户角色，仅拥有查看权限',
  '000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'admin',
  'admin'
);

-- 2. 为演示角色分配查询权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 
  (SELECT role_id FROM sys_role WHERE role_key = 'demo' AND tenant_id = '000000'),
  m.menu_id 
FROM sys_menu m
WHERE (
  m.perms LIKE '%:list' 
  OR m.perms LIKE '%:query'
  OR m.perms LIKE '%:export'
  OR m.perms IS NULL
)
AND m.del_flag = '0'
AND m.status = '0'
AND m.tenant_id = '000000';

-- 3. 创建演示用户
INSERT INTO sys_user (
  user_name, 
  nick_name,
  user_type,
  email,
  phonenumber,
  sex,
  password,
  status,
  del_flag,
  dept_id,
  tenant_id,
  create_time,
  update_time,
  create_by,
  update_by,
  remark
) VALUES (
  'demo',
  '演示账号',
  '00',
  'demo@example.com',
  '13800138000',
  '0',
  '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iAt6Z5EH',
  '0',
  '0',
  (SELECT dept_id FROM sys_dept WHERE tenant_id = '000000' ORDER BY dept_id LIMIT 1),
  '000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'admin',
  'admin',
  '演示账户，密码：demo123'
);

-- 4. 为演示用户分配演示角色
INSERT INTO sys_user_role (user_id, role_id)
SELECT 
  (SELECT user_id FROM sys_user WHERE user_name = 'demo' AND tenant_id = '000000'),
  (SELECT role_id FROM sys_role WHERE role_key = 'demo' AND tenant_id = '000000');

-- 5. 为演示用户分配默认岗位（如果存在）
INSERT INTO sys_user_post (user_id, post_id)
SELECT 
  (SELECT user_id FROM sys_user WHERE user_name = 'demo' AND tenant_id = '000000'),
  (SELECT post_id FROM sys_post WHERE tenant_id = '000000' ORDER BY post_id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM sys_post WHERE tenant_id = '000000');

-- =============================================
-- 验证查询
-- =============================================

-- 查看演示角色
SELECT role_id, role_name, role_key, data_scope, status
FROM sys_role 
WHERE role_key = 'demo' AND tenant_id = '000000';

-- 查看演示用户
SELECT user_id, user_name, nick_name, email, status
FROM sys_user 
WHERE user_name = 'demo' AND tenant_id = '000000';

-- 查看权限数量
SELECT COUNT(*) as permission_count
FROM sys_role_menu rm
WHERE rm.role_id = (SELECT role_id FROM sys_role WHERE role_key = 'demo' AND tenant_id = '000000');

-- 查看具体权限（前10条）
SELECT m.menu_name, m.perms
FROM sys_role_menu rm
JOIN sys_menu m ON rm.menu_id = m.menu_id
WHERE rm.role_id = (SELECT role_id FROM sys_role WHERE role_key = 'demo' AND tenant_id = '000000')
AND m.perms IS NOT NULL
ORDER BY m.menu_name
LIMIT 10;
