-- 验证 mkt_play_template 表结构
-- 执行方式: psql -h 127.0.0.1 -p 5432 -U postgres -d nest-admin-soybean -f verify-schema.sql

\echo '========== 查看 mkt_play_template 表结构 =========='
\d mkt_play_template

\echo ''
\echo '========== 查询现有数据（包含新字段）=========='
SELECT id, code, name, product_id, sku_id, product_name 
FROM mkt_play_template 
LIMIT 5;
