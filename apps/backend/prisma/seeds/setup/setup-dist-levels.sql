-- 为默认租户 000000 初始化分销员等级数据
-- 执行: psql -U postgres -d nest-admin-soybean -f prisma/seeds/setup/setup-dist-levels.sql
-- 或在 Prisma Studio 执行
INSERT INTO sys_dist_level (
  tenant_id, level_id, level_name, level1_rate, level2_rate,
  sort, is_active, create_by, update_by
) VALUES
  ('000000', 0, '普通用户', 0, 0, 0, true, 'admin', 'admin'),
  ('000000', 1, '初级分销员', 0.1, 0.05, 1, true, 'admin', 'admin'),
  ('000000', 2, '中级分销员', 0.12, 0.06, 2, true, 'admin', 'admin')
ON CONFLICT (tenant_id, level_id) DO NOTHING;
