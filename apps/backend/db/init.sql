/*
 Navicat Premium Dump SQL

 Source Server         : postgres
 Source Server Type    : PostgreSQL
 Source Server Version : 170005 (170005)
 Source Host           : localhost:5432
 Source Catalog        : nest-admin-soybean
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170005 (170005)
 File Encoding         : 65001

 Date: 23/12/2025 19:09:54
*/


-- ----------------------------
-- Sequence structure for gen_table_column_column_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."gen_table_column_column_id_seq";
CREATE SEQUENCE "public"."gen_table_column_column_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."gen_table_column_column_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for gen_table_table_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."gen_table_table_id_seq";
CREATE SEQUENCE "public"."gen_table_table_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."gen_table_table_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_client_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_client_id_seq";
CREATE SEQUENCE "public"."sys_client_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_client_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_config_config_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_config_config_id_seq";
CREATE SEQUENCE "public"."sys_config_config_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_config_config_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_dept_dept_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_dept_dept_id_seq";
CREATE SEQUENCE "public"."sys_dept_dept_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_dept_dept_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_dict_data_dict_code_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_dict_data_dict_code_seq";
CREATE SEQUENCE "public"."sys_dict_data_dict_code_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_dict_data_dict_code_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_dict_type_dict_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_dict_type_dict_id_seq";
CREATE SEQUENCE "public"."sys_dict_type_dict_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_dict_type_dict_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_file_folder_folder_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_file_folder_folder_id_seq";
CREATE SEQUENCE "public"."sys_file_folder_folder_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_file_folder_folder_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_job_job_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_job_job_id_seq";
CREATE SEQUENCE "public"."sys_job_job_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_job_job_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_job_log_job_log_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_job_log_job_log_id_seq";
CREATE SEQUENCE "public"."sys_job_log_job_log_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_job_log_job_log_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_logininfor_info_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_logininfor_info_id_seq";
CREATE SEQUENCE "public"."sys_logininfor_info_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_logininfor_info_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_menu_menu_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_menu_menu_id_seq";
CREATE SEQUENCE "public"."sys_menu_menu_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_menu_menu_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_notice_notice_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_notice_notice_id_seq";
CREATE SEQUENCE "public"."sys_notice_notice_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_notice_notice_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_oper_log_oper_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_oper_log_oper_id_seq";
CREATE SEQUENCE "public"."sys_oper_log_oper_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_oper_log_oper_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_post_post_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_post_post_id_seq";
CREATE SEQUENCE "public"."sys_post_post_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_post_post_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_role_role_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_role_role_id_seq";
CREATE SEQUENCE "public"."sys_role_role_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_role_role_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_tenant_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_tenant_id_seq";
CREATE SEQUENCE "public"."sys_tenant_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_tenant_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_tenant_package_package_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_tenant_package_package_id_seq";
CREATE SEQUENCE "public"."sys_tenant_package_package_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_tenant_package_package_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for sys_user_user_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."sys_user_user_id_seq";
CREATE SEQUENCE "public"."sys_user_user_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."sys_user_user_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Table structure for gen_table
-- ----------------------------
DROP TABLE IF EXISTS "public"."gen_table";
CREATE TABLE "public"."gen_table" (
  "table_id" int4 NOT NULL DEFAULT nextval('gen_table_table_id_seq'::regclass),
  "table_name" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "table_comment" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "sub_table_name" varchar(64) COLLATE "pg_catalog"."default",
  "sub_table_fk_name" varchar(64) COLLATE "pg_catalog"."default",
  "class_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "tpl_category" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "tpl_web_type" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "package_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "module_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "business_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "function_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "function_author" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "gen_type" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "gen_path" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "options" varchar(1000) COLLATE "pg_catalog"."default" NOT NULL,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."gen_table" OWNER TO "postgres";

-- ----------------------------
-- Records of gen_table
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for gen_table_column
-- ----------------------------
DROP TABLE IF EXISTS "public"."gen_table_column";
CREATE TABLE "public"."gen_table_column" (
  "column_id" int4 NOT NULL DEFAULT nextval('gen_table_column_column_id_seq'::regclass),
  "table_id" int4 NOT NULL,
  "column_name" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "column_comment" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "column_type" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "java_type" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "java_field" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "is_pk" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "is_increment" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "is_required" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "is_insert" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "is_edit" char(1) COLLATE "pg_catalog"."default",
  "is_list" char(1) COLLATE "pg_catalog"."default",
  "is_query" char(1) COLLATE "pg_catalog"."default",
  "query_type" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "html_type" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "dict_type" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "column_default" varchar(200) COLLATE "pg_catalog"."default",
  "sort" int4 NOT NULL,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."gen_table_column" OWNER TO "postgres";

-- ----------------------------
-- Records of gen_table_column
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_client
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_client";
CREATE TABLE "public"."sys_client" (
  "id" int4 NOT NULL DEFAULT nextval('sys_client_id_seq'::regclass),
  "client_id" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "client_key" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "client_secret" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "grant_type_list" varchar(255) COLLATE "pg_catalog"."default",
  "device_type" varchar(20) COLLATE "pg_catalog"."default",
  "active_timeout" int4 NOT NULL DEFAULT 1800,
  "timeout" int4 NOT NULL DEFAULT 86400,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."sys_client" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_client
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_client" ("id", "client_id", "client_key", "client_secret", "grant_type_list", "device_type", "active_timeout", "timeout", "status", "del_flag", "create_by", "create_time", "update_by", "update_time") VALUES (1, 'e5cd7e4891bf95d1d19206ce24a7b32e', 'pc', 'pc123', 'password,social', 'pc', 1800, 86400, '0', '0', 'admin', '2025-02-28 08:52:10', '', '2025-12-23 18:33:08.150524');
INSERT INTO "public"."sys_client" ("id", "client_id", "client_key", "client_secret", "grant_type_list", "device_type", "active_timeout", "timeout", "status", "del_flag", "create_by", "create_time", "update_by", "update_time") VALUES (2, '428a8310a3c9c5eb0a7c4c9d4b3d0c37', 'app', 'app123', 'password,social', 'app', 1800, 86400, '0', '0', 'admin', '2025-02-28 08:52:10', '', '2025-12-23 18:33:08.150524');
COMMIT;

-- ----------------------------
-- Table structure for sys_config
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_config";
CREATE TABLE "public"."sys_config" (
  "config_id" int4 NOT NULL DEFAULT nextval('sys_config_config_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "config_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "config_key" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "config_value" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "config_type" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default",
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar
)
;
ALTER TABLE "public"."sys_config" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_config
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (1, '000000', '主框架页-默认皮肤样式名称', 'sys.index.skinName', 'skin-blue', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '蓝色 skin-blue、绿色 skin-green、紫色 skin-purple、红色 skin-red、黄色 skin-yellow', '0', '0');
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (2, '000000', '用户管理-账号初始密码', 'sys.user.initPassword', '123456', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '初始化密码 123456', '0', '0');
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (3, '000000', '主框架页-侧边栏主题', 'sys.index.sideTheme', 'theme-dark', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '深色主题theme-dark，浅色主题theme-light', '0', '0');
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (4, '000000', '账号自助-验证码开关', 'sys.account.captchaEnabled', 'true', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '是否开启验证码功能（true开启，false关闭）', '0', '0');
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (5, '000000', '账号自助-是否开启用户注册功能', 'sys.account.registerUser', 'false', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '是否开启注册用户功能（true开启，false关闭）', '0', '0');
INSERT INTO "public"."sys_config" ("config_id", "tenant_id", "config_name", "config_key", "config_value", "config_type", "create_by", "create_time", "update_by", "update_time", "remark", "status", "del_flag") VALUES (6, '000000', '用户登录-黑名单列表', 'sys.login.blackIPList', '', 'Y', 'admin', '2025-02-28 08:52:10', '', NULL, '设置登录IP黑名单限制，多个匹配项以;分隔，支持匹配（*通配、网段）', '0', '0');
COMMIT;

-- ----------------------------
-- Table structure for sys_dept
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_dept";
CREATE TABLE "public"."sys_dept" (
  "dept_id" int4 NOT NULL DEFAULT nextval('sys_dept_dept_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "parent_id" int4 NOT NULL,
  "ancestors" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "dept_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "order_num" int4 NOT NULL,
  "leader" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "phone" varchar(11) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "email" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_dept" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_dept
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (100, '000000', 0, '0', 'nest-admin-soybean科技', 0, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (101, '000000', 100, '0,100', '深圳总公司', 1, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (102, '000000', 100, '0,100', '长沙分公司', 2, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (103, '000000', 101, '0,100,101', '研发部门', 1, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (104, '000000', 101, '0,100,101', '市场部门', 2, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (105, '000000', 101, '0,100,101', '测试部门', 3, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (106, '000000', 101, '0,100,101', '财务部门', 4, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (107, '000000', 101, '0,100,101', '运维部门', 5, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (108, '000000', 102, '0,100,102', '市场部门', 1, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
INSERT INTO "public"."sys_dept" ("dept_id", "tenant_id", "parent_id", "ancestors", "dept_name", "order_num", "leader", "phone", "email", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (109, '000000', 102, '0,100,102', '财务部门', 2, 'nest-admin-soybean', '15888888888', 'demo@nestadmin.com', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, NULL);
COMMIT;

-- ----------------------------
-- Table structure for sys_dict_data
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_dict_data";
CREATE TABLE "public"."sys_dict_data" (
  "dict_code" int4 NOT NULL DEFAULT nextval('sys_dict_data_dict_code_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "dict_sort" int4 NOT NULL DEFAULT 0,
  "dict_label" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "dict_value" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "dict_type" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "css_class" varchar(100) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "list_class" varchar(100) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "is_default" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'N'::bpchar,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar
)
;
ALTER TABLE "public"."sys_dict_data" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_dict_data
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1, '000000', 1, '男', '0', 'sys_user_sex', '', '', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '性别男', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (2, '000000', 2, '女', '1', 'sys_user_sex', '', '', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '性别女', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (3, '000000', 3, '未知', '2', 'sys_user_sex', '', '', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '性别未知', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (4, '000000', 1, '显示', '0', 'sys_show_hide', '', 'primary', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '显示菜单', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (5, '000000', 2, '隐藏', '1', 'sys_show_hide', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '隐藏菜单', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (6, '000000', 1, '正常', '0', 'sys_normal_disable', '', 'primary', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '正常状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (7, '000000', 2, '停用', '1', 'sys_normal_disable', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '停用状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (8, '000000', 1, '正常', '0', 'sys_job_status', '', 'primary', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '正常状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (9, '000000', 2, '暂停', '1', 'sys_job_status', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '停用状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (10, '000000', 1, '默认', 'DEFAULT', 'sys_job_group', '', '', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '默认分组', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (11, '000000', 2, '系统', 'SYSTEM', 'sys_job_group', '', '', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '系统分组', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (12, '000000', 1, '是', 'Y', 'sys_yes_no', '', 'primary', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '系统默认是', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (13, '000000', 2, '否', 'N', 'sys_yes_no', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '系统默认否', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (14, '000000', 1, '通知', '1', 'sys_notice_type', '', 'warning', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '通知', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (15, '000000', 2, '公告', '2', 'sys_notice_type', '', 'success', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '公告', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (16, '000000', 1, '正常', '0', 'sys_notice_status', '', 'primary', 'Y', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '正常状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (17, '000000', 2, '关闭', '1', 'sys_notice_status', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '关闭状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (18, '000000', 99, '其他', '0', 'sys_oper_type', '', 'info', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '其他操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (19, '000000', 1, '新增', '1', 'sys_oper_type', '', 'info', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '新增操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (20, '000000', 2, '修改', '2', 'sys_oper_type', '', 'info', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '修改操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (21, '000000', 3, '删除', '3', 'sys_oper_type', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '删除操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (22, '000000', 4, '授权', '4', 'sys_oper_type', '', 'primary', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '授权操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (23, '000000', 5, '导出', '5', 'sys_oper_type', '', 'warning', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '导出操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (24, '000000', 6, '导入', '6', 'sys_oper_type', '', 'warning', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '导入操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (25, '000000', 7, '强退', '7', 'sys_oper_type', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '强退操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (26, '000000', 8, '生成代码', '8', 'sys_oper_type', '', 'warning', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '生成操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (27, '000000', 9, '清空数据', '9', 'sys_oper_type', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '清空操作', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (28, '000000', 1, '成功', '0', 'sys_common_status', '', 'primary', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '正常状态', '0');
INSERT INTO "public"."sys_dict_data" ("dict_code", "tenant_id", "dict_sort", "dict_label", "dict_value", "dict_type", "css_class", "list_class", "is_default", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (29, '000000', 2, '失败', '1', 'sys_common_status', '', 'danger', 'N', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '停用状态', '0');
COMMIT;

-- ----------------------------
-- Table structure for sys_dict_type
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_dict_type";
CREATE TABLE "public"."sys_dict_type" (
  "dict_id" int4 NOT NULL DEFAULT nextval('sys_dict_type_dict_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "dict_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "dict_type" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar
)
;
ALTER TABLE "public"."sys_dict_type" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_dict_type
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1, '000000', '用户性别', 'sys_user_sex', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '用户性别列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (2, '000000', '菜单状态', 'sys_show_hide', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '菜单状态列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (3, '000000', '系统开关', 'sys_normal_disable', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '系统开关列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (4, '000000', '任务状态', 'sys_job_status', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '任务状态列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (5, '000000', '任务分组', 'sys_job_group', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '任务分组列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (6, '000000', '系统是否', 'sys_yes_no', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '系统是否列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (7, '000000', '通知类型', 'sys_notice_type', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '通知类型列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (8, '000000', '通知状态', 'sys_notice_status', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '通知状态列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (9, '000000', '操作类型', 'sys_oper_type', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '操作类型列表', '0');
INSERT INTO "public"."sys_dict_type" ("dict_id", "tenant_id", "dict_name", "dict_type", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (10, '000000', '系统状态', 'sys_common_status', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '登录状态列表', '0');
COMMIT;

-- ----------------------------
-- Table structure for sys_file_folder
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_file_folder";
CREATE TABLE "public"."sys_file_folder" (
  "folder_id" int4 NOT NULL DEFAULT nextval('sys_file_folder_folder_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "parent_id" int4 NOT NULL DEFAULT 0,
  "folder_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "folder_path" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "order_num" int4 NOT NULL DEFAULT 0,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_file_folder" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_file_folder
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_file_share
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_file_share";
CREATE TABLE "public"."sys_file_share" (
  "share_id" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "upload_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "share_code" varchar(6) COLLATE "pg_catalog"."default",
  "expire_time" timestamp(6),
  "max_download" int4 NOT NULL DEFAULT '-1'::integer,
  "download_count" int4 NOT NULL DEFAULT 0,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."sys_file_share" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_file_share
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_job
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_job";
CREATE TABLE "public"."sys_job" (
  "job_id" int4 NOT NULL DEFAULT nextval('sys_job_job_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "job_name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "job_group" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "invoke_target" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "cron_expression" varchar(255) COLLATE "pg_catalog"."default",
  "misfire_policy" varchar(20) COLLATE "pg_catalog"."default",
  "concurrent" char(1) COLLATE "pg_catalog"."default",
  "status" char(1) COLLATE "pg_catalog"."default",
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_job" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_job
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_job" ("job_id", "tenant_id", "job_name", "job_group", "invoke_target", "cron_expression", "misfire_policy", "concurrent", "status", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (1, '000000', '系统默认（无参）', 'DEFAULT', 'task.noParams', '0/10 * * * * ?', '3', '1', '1', 'admin', '2025-02-28 08:52:10', '', NULL, '');
INSERT INTO "public"."sys_job" ("job_id", "tenant_id", "job_name", "job_group", "invoke_target", "cron_expression", "misfire_policy", "concurrent", "status", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (2, '000000', '系统默认（有参）', 'DEFAULT', 'task.params(''ry'')', '0/15 * * * * ?', '3', '1', '1', 'admin', '2025-02-28 08:52:10', '', NULL, '');
INSERT INTO "public"."sys_job" ("job_id", "tenant_id", "job_name", "job_group", "invoke_target", "cron_expression", "misfire_policy", "concurrent", "status", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (3, '000000', '系统默认（多参）', 'DEFAULT', 'task.multipleParams(''ry'', true, 2000L, 316.50D, 100)', '0/20 * * * * ?', '3', '1', '1', 'admin', '2025-02-28 08:52:10', '', NULL, '');
COMMIT;

-- ----------------------------
-- Table structure for sys_job_log
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_job_log";
CREATE TABLE "public"."sys_job_log" (
  "job_log_id" int4 NOT NULL DEFAULT nextval('sys_job_log_job_log_id_seq'::regclass),
  "job_name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "job_group" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "invoke_target" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "job_message" varchar(500) COLLATE "pg_catalog"."default",
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "exception_info" varchar(2000) COLLATE "pg_catalog"."default",
  "create_time" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."sys_job_log" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_job_log
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_logininfor
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_logininfor";
CREATE TABLE "public"."sys_logininfor" (
  "info_id" int4 NOT NULL DEFAULT nextval('sys_logininfor_info_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "user_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "ipaddr" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "login_location" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "browser" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "os" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "device_type" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "msg" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "login_time" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."sys_logininfor" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_logininfor
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_logininfor" ("info_id", "tenant_id", "user_name", "ipaddr", "login_location", "browser", "os", "device_type", "status", "msg", "del_flag", "login_time") VALUES (1, '000000', '', '::1', '', 'Chrome 143.0.0', 'Mac OS X', '0', '0', '登录成功', '0', '2025-12-23 19:08:09.250011');
COMMIT;

-- ----------------------------
-- Table structure for sys_menu
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_menu";
CREATE TABLE "public"."sys_menu" (
  "menu_id" int4 NOT NULL DEFAULT nextval('sys_menu_menu_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "menu_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "parent_id" int4 NOT NULL,
  "order_num" int4 NOT NULL,
  "path" varchar(200) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "component" varchar(255) COLLATE "pg_catalog"."default",
  "query" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "is_frame" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "is_cache" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "menu_type" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "visible" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "perms" varchar(100) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "icon" varchar(100) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar
)
;
ALTER TABLE "public"."sys_menu" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_menu
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1, '000000', '系统管理', 0, 1, 'system', NULL, '', '1', '0', 'M', '0', '0', '', 'system', 'admin', '2025-02-28 08:52:10', '', NULL, '系统管理目录', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (2, '000000', '系统监控', 0, 2, 'monitor', NULL, '', '1', '0', 'M', '0', '0', '', 'monitor', 'admin', '2025-02-28 08:52:10', '', NULL, '系统监控目录', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (3, '000000', '系统工具', 0, 3, 'tool', NULL, '', '1', '0', 'M', '0', '0', '', 'tool', 'admin', '2025-02-28 08:52:10', '', NULL, '系统工具目录', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (4, '000000', 'nest-admin-soybean官网', 0, 4, 'https://nest-admin.dooring.vip', NULL, '', '0', '0', 'M', '0', '0', '', 'guide', 'admin', '2025-02-28 08:52:10', '', NULL, 'nest-admin-soybean官网地址', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (100, '000000', '用户管理', 1, 1, 'user', 'system/user/index', '', '1', '0', 'C', '0', '0', 'system:user:list', 'user', 'admin', '2025-02-28 08:52:10', '', NULL, '用户管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (101, '000000', '角色管理', 1, 2, 'role', 'system/role/index', '', '1', '0', 'C', '0', '0', 'system:role:list', 'peoples', 'admin', '2025-02-28 08:52:10', '', NULL, '角色管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (102, '000000', '菜单管理', 1, 3, 'menu', 'system/menu/index', '', '1', '0', 'C', '0', '0', 'system:menu:list', 'tree-table', 'admin', '2025-02-28 08:52:10', '', NULL, '菜单管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (103, '000000', '部门管理', 1, 4, 'dept', 'system/dept/index', '', '1', '0', 'C', '0', '0', 'system:dept:list', 'tree', 'admin', '2025-02-28 08:52:10', '', NULL, '部门管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (104, '000000', '岗位管理', 1, 5, 'post', 'system/post/index', '', '1', '0', 'C', '0', '0', 'system:post:list', 'post', 'admin', '2025-02-28 08:52:10', '', NULL, '岗位管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (105, '000000', '字典管理', 1, 6, 'dict', 'system/dict/index', '', '1', '0', 'C', '0', '0', 'system:dict:list', 'dict', 'admin', '2025-02-28 08:52:10', '', NULL, '字典管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (106, '000000', '参数设置', 1, 7, 'config', 'system/config/index', '', '1', '0', 'C', '0', '0', 'system:config:list', 'edit', 'admin', '2025-02-28 08:52:10', '', NULL, '参数设置菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (107, '000000', '通知公告', 1, 8, 'notice', 'system/notice/index', '', '1', '0', 'C', '0', '0', 'system:notice:list', 'message', 'admin', '2025-02-28 08:52:10', '', NULL, '通知公告菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (118, '000000', '租户管理', 1, 9, 'tenant', 'system/tenant/index', '', '1', '0', 'C', '0', '0', 'system:tenant:list', 'peoples', 'admin', '2025-02-28 08:52:10', '', NULL, '租户管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (119, '000000', '租户套餐管理', 1, 10, 'tenant-package', 'system/tenant-package/index', '', '1', '0', 'C', '0', '0', 'system:tenantPackage:list', 'skill', 'admin', '2025-02-28 08:52:10', '', NULL, '租户套餐管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (120, '000000', '文件管理', 1, 11, 'file-manager', 'system/file-manager/index', '', '1', '0', 'C', '0', '0', 'system:file:list', 'folder', 'admin', '2025-02-28 08:52:10', '', NULL, '文件管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (108, '000000', '日志管理', 1, 9, 'log', '', '', '1', '0', 'M', '0', '0', '', 'log', 'admin', '2025-02-28 08:52:10', '', NULL, '日志管理菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (109, '000000', '在线用户', 2, 1, 'online', 'monitor/online/index', '', '1', '0', 'C', '0', '0', 'monitor:online:list', 'online', 'admin', '2025-02-28 08:52:10', '', NULL, '在线用户菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (110, '000000', '定时任务', 2, 2, 'job', 'monitor/job/index', '', '1', '0', 'C', '0', '0', 'monitor:job:list', 'job', 'admin', '2025-02-28 08:52:10', '', NULL, '定时任务菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (111, '000000', '数据监控', 2, 3, 'druid', 'monitor/druid/index', '', '1', '0', 'C', '0', '0', 'monitor:druid:list', 'druid', 'admin', '2025-02-28 08:52:10', '', NULL, '数据监控菜单', '1');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (112, '000000', '服务监控', 2, 4, 'server', 'monitor/server/index', '', '1', '0', 'C', '0', '0', 'monitor:server:list', 'server', 'admin', '2025-02-28 08:52:10', '', NULL, '服务监控菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (113, '000000', '缓存监控', 2, 5, 'cache', 'monitor/cache/index', '', '1', '0', 'C', '0', '0', 'monitor:cache:list', 'redis', 'admin', '2025-02-28 08:52:10', '', NULL, '缓存监控菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (114, '000000', '缓存列表', 2, 6, 'cacheList', 'monitor/cache/list', '', '1', '0', 'C', '0', '0', 'monitor:cache:list', 'redis-list', 'admin', '2025-02-28 08:52:10', '', NULL, '缓存列表菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (115, '000000', '表单构建', 3, 1, 'build', 'tool/build/index', '', '1', '0', 'C', '0', '0', 'tool:build:list', 'build', 'admin', '2025-02-28 08:52:10', '', NULL, '表单构建菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (116, '000000', '代码生成', 3, 2, 'gen', 'tool/gen/index', '', '1', '0', 'C', '0', '0', 'tool:gen:list', 'code', 'admin', '2025-02-28 08:52:10', '', NULL, '代码生成菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (117, '000000', '系统接口', 3, 3, 'swagger', 'tool/swagger/index', '', '1', '0', 'C', '0', '0', 'tool:swagger:list', 'swagger', 'admin', '2025-02-28 08:52:10', '', NULL, '系统接口菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (500, '000000', '操作日志', 108, 1, 'operlog', 'monitor/operlog/index', '', '1', '0', 'C', '0', '0', 'monitor:operlog:list', 'form', 'admin', '2025-02-28 08:52:10', '', NULL, '操作日志菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (501, '000000', '登录日志', 108, 2, 'logininfor', 'monitor/logininfor/index', '', '1', '0', 'C', '0', '0', 'monitor:logininfor:list', 'logininfor', 'admin', '2025-02-28 08:52:10', '', NULL, '登录日志菜单', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1000, '000000', '用户查询', 100, 1, '', '', '', '1', '0', 'F', '0', '0', 'system:user:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1001, '000000', '用户新增', 100, 2, '', '', '', '1', '0', 'F', '0', '0', 'system:user:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1002, '000000', '用户修改', 100, 3, '', '', '', '1', '0', 'F', '0', '0', 'system:user:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1003, '000000', '用户删除', 100, 4, '', '', '', '1', '0', 'F', '0', '0', 'system:user:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1004, '000000', '用户导出', 100, 5, '', '', '', '1', '0', 'F', '0', '0', 'system:user:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1005, '000000', '用户导入', 100, 6, '', '', '', '1', '0', 'F', '0', '0', 'system:user:import', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1006, '000000', '重置密码', 100, 7, '', '', '', '1', '0', 'F', '0', '0', 'system:user:resetPwd', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1007, '000000', '角色查询', 101, 1, '', '', '', '1', '0', 'F', '0', '0', 'system:role:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1008, '000000', '角色新增', 101, 2, '', '', '', '1', '0', 'F', '0', '0', 'system:role:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1009, '000000', '角色修改', 101, 3, '', '', '', '1', '0', 'F', '0', '0', 'system:role:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1010, '000000', '角色删除', 101, 4, '', '', '', '1', '0', 'F', '0', '0', 'system:role:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1011, '000000', '角色导出', 101, 5, '', '', '', '1', '0', 'F', '0', '0', 'system:role:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1012, '000000', '菜单查询', 102, 1, '', '', '', '1', '0', 'F', '0', '0', 'system:menu:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1013, '000000', '菜单新增', 102, 2, '', '', '', '1', '0', 'F', '0', '0', 'system:menu:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1014, '000000', '菜单修改', 102, 3, '', '', '', '1', '0', 'F', '0', '0', 'system:menu:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1015, '000000', '菜单删除', 102, 4, '', '', '', '1', '0', 'F', '0', '0', 'system:menu:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1016, '000000', '部门查询', 103, 1, '', '', '', '1', '0', 'F', '0', '0', 'system:dept:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1017, '000000', '部门新增', 103, 2, '', '', '', '1', '0', 'F', '0', '0', 'system:dept:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1018, '000000', '部门修改', 103, 3, '', '', '', '1', '0', 'F', '0', '0', 'system:dept:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1019, '000000', '部门删除', 103, 4, '', '', '', '1', '0', 'F', '0', '0', 'system:dept:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1020, '000000', '岗位查询', 104, 1, '', '', '', '1', '0', 'F', '0', '0', 'system:post:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1021, '000000', '岗位新增', 104, 2, '', '', '', '1', '0', 'F', '0', '0', 'system:post:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1022, '000000', '岗位修改', 104, 3, '', '', '', '1', '0', 'F', '0', '0', 'system:post:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1023, '000000', '岗位删除', 104, 4, '', '', '', '1', '0', 'F', '0', '0', 'system:post:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1024, '000000', '岗位导出', 104, 5, '', '', '', '1', '0', 'F', '0', '0', 'system:post:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1025, '000000', '字典查询', 105, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:dict:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1026, '000000', '字典新增', 105, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:dict:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1027, '000000', '字典修改', 105, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:dict:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1028, '000000', '字典删除', 105, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:dict:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1029, '000000', '字典导出', 105, 5, '#', '', '', '1', '0', 'F', '0', '0', 'system:dict:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1030, '000000', '参数查询', 106, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:config:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1031, '000000', '参数新增', 106, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:config:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1032, '000000', '参数修改', 106, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:config:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1033, '000000', '参数删除', 106, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:config:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1034, '000000', '参数导出', 106, 5, '#', '', '', '1', '0', 'F', '0', '0', 'system:config:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1035, '000000', '公告查询', 107, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:notice:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1036, '000000', '公告新增', 107, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:notice:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1037, '000000', '公告修改', 107, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:notice:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1038, '000000', '公告删除', 107, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:notice:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1039, '000000', '操作查询', 500, 1, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:operlog:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1040, '000000', '操作删除', 500, 2, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:operlog:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1041, '000000', '日志导出', 500, 3, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:operlog:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1042, '000000', '登录查询', 501, 1, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:logininfor:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1043, '000000', '登录删除', 501, 2, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:logininfor:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1044, '000000', '日志导出', 501, 3, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:logininfor:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1045, '000000', '账户解锁', 501, 4, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:logininfor:unlock', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1046, '000000', '在线查询', 109, 1, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:online:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1047, '000000', '批量强退', 109, 2, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:online:batchLogout', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1048, '000000', '单条强退', 109, 3, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:online:forceLogout', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1049, '000000', '任务查询', 110, 1, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1050, '000000', '任务新增', 110, 2, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1051, '000000', '任务修改', 110, 3, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1052, '000000', '任务删除', 110, 4, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1053, '000000', '状态修改', 110, 5, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:changeStatus', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1054, '000000', '任务导出', 110, 6, '#', '', '', '1', '0', 'F', '0', '0', 'monitor:job:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1055, '000000', '生成查询', 116, 1, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1056, '000000', '生成修改', 116, 2, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1057, '000000', '生成删除', 116, 3, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1058, '000000', '导入代码', 116, 4, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:import', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1059, '000000', '预览代码', 116, 5, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:preview', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1060, '000000', '生成代码', 116, 6, '#', '', '', '1', '0', 'F', '0', '0', 'tool:gen:code', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1061, '000000', '租户查询', 118, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenant:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1062, '000000', '租户新增', 118, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenant:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1063, '000000', '租户修改', 118, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenant:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1064, '000000', '租户删除', 118, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenant:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1065, '000000', '租户导出', 118, 5, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenant:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1066, '000000', '租户套餐查询', 119, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenantPackage:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1067, '000000', '租户套餐新增', 119, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenantPackage:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1068, '000000', '租户套餐修改', 119, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenantPackage:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1069, '000000', '租户套餐删除', 119, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenantPackage:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1070, '000000', '租户套餐导出', 119, 5, '#', '', '', '1', '0', 'F', '0', '0', 'system:tenantPackage:export', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1071, '000000', '文件查询', 120, 1, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:query', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1072, '000000', '文件新增', 120, 2, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:add', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1073, '000000', '文件编辑', 120, 3, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:edit', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1074, '000000', '文件删除', 120, 4, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1075, '000000', '文件分享', 120, 5, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:share', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1076, '000000', '回收站列表', 120, 6, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:recycle:list', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1077, '000000', '回收站恢复', 120, 7, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:recycle:restore', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_menu" ("menu_id", "tenant_id", "menu_name", "parent_id", "order_num", "path", "component", "query", "is_frame", "is_cache", "menu_type", "visible", "status", "perms", "icon", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1078, '000000', '回收站删除', 120, 8, '#', '', '', '1', '0', 'F', '0', '0', 'system:file:recycle:remove', '#', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
COMMIT;

-- ----------------------------
-- Table structure for sys_notice
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_notice";
CREATE TABLE "public"."sys_notice" (
  "notice_id" int4 NOT NULL DEFAULT nextval('sys_notice_notice_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "notice_title" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "notice_type" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "notice_content" text COLLATE "pg_catalog"."default",
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_notice" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_notice
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_notice" ("notice_id", "tenant_id", "notice_title", "notice_type", "notice_content", "status", "create_by", "create_time", "update_by", "update_time", "del_flag", "remark") VALUES (1, '000000', '温馨提醒：2025-01-01 Nest-Admin-Soybean新版本发布啦', '2', '新版本内容', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '0', NULL);
INSERT INTO "public"."sys_notice" ("notice_id", "tenant_id", "notice_title", "notice_type", "notice_content", "status", "create_by", "create_time", "update_by", "update_time", "del_flag", "remark") VALUES (2, '000000', '维护通知：2025-01-01 Nest-Admin-Soybean系统凌晨维护', '1', '维护内容', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '0', NULL);
COMMIT;

-- ----------------------------
-- Table structure for sys_oper_log
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_oper_log";
CREATE TABLE "public"."sys_oper_log" (
  "oper_id" int4 NOT NULL DEFAULT nextval('sys_oper_log_oper_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "title" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "business_type" int4 NOT NULL,
  "request_method" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "operator_type" int4 NOT NULL,
  "oper_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "dept_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "oper_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "oper_location" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "oper_param" varchar(2000) COLLATE "pg_catalog"."default" NOT NULL,
  "json_result" varchar(2000) COLLATE "pg_catalog"."default" NOT NULL,
  "error_msg" varchar(2000) COLLATE "pg_catalog"."default" NOT NULL,
  "method" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "oper_ip" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "oper_time" timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL,
  "cost_time" int4 NOT NULL
)
;
ALTER TABLE "public"."sys_oper_log" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_oper_log
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_post
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_post";
CREATE TABLE "public"."sys_post" (
  "post_id" int4 NOT NULL DEFAULT nextval('sys_post_post_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "dept_id" int4,
  "post_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "post_category" varchar(100) COLLATE "pg_catalog"."default",
  "post_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "post_sort" int4 NOT NULL DEFAULT 0,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default",
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar
)
;
ALTER TABLE "public"."sys_post" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_post
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_post" ("post_id", "tenant_id", "dept_id", "post_code", "post_category", "post_name", "post_sort", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (1, '000000', NULL, 'ceo', NULL, '董事长', 1, '0', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_post" ("post_id", "tenant_id", "dept_id", "post_code", "post_category", "post_name", "post_sort", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (2, '000000', NULL, 'se', NULL, '项目经理', 2, '0', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_post" ("post_id", "tenant_id", "dept_id", "post_code", "post_category", "post_name", "post_sort", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (3, '000000', NULL, 'hr', NULL, '人力资源', 3, '0', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
INSERT INTO "public"."sys_post" ("post_id", "tenant_id", "dept_id", "post_code", "post_category", "post_name", "post_sort", "status", "create_by", "create_time", "update_by", "update_time", "remark", "del_flag") VALUES (4, '000000', NULL, 'user', NULL, '普通员工', 4, '0', 'admin', '2025-02-28 08:52:10', '', NULL, '', '0');
COMMIT;

-- ----------------------------
-- Table structure for sys_role
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_role";
CREATE TABLE "public"."sys_role" (
  "role_id" int4 NOT NULL DEFAULT nextval('sys_role_role_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "role_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "role_key" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "role_sort" int4 NOT NULL,
  "data_scope" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '1'::bpchar,
  "menu_check_strictly" bool NOT NULL DEFAULT false,
  "dept_check_strictly" bool NOT NULL DEFAULT false,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_role" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_role
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_role" ("role_id", "tenant_id", "role_name", "role_key", "role_sort", "data_scope", "menu_check_strictly", "dept_check_strictly", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (1, '000000', '超级管理员', 'admin', 1, '1', 't', 't', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '超级管理员');
INSERT INTO "public"."sys_role" ("role_id", "tenant_id", "role_name", "role_key", "role_sort", "data_scope", "menu_check_strictly", "dept_check_strictly", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (2, '000000', '普通角色', 'common', 2, '2', 't', 't', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '普通角色');
INSERT INTO "public"."sys_role" ("role_id", "tenant_id", "role_name", "role_key", "role_sort", "data_scope", "menu_check_strictly", "dept_check_strictly", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (3, '000000', '演示角色', 'demo', 10, '5', 't', 't', '0', '0', 'admin', '2025-02-28 08:52:10', '', NULL, '演示账户角色，仅拥有查看权限');
COMMIT;

-- ----------------------------
-- Table structure for sys_role_dept
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_role_dept";
CREATE TABLE "public"."sys_role_dept" (
  "role_id" int4 NOT NULL,
  "dept_id" int4 NOT NULL
)
;
ALTER TABLE "public"."sys_role_dept" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_role_dept
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_role_dept" ("role_id", "dept_id") VALUES (2, 100);
INSERT INTO "public"."sys_role_dept" ("role_id", "dept_id") VALUES (2, 101);
INSERT INTO "public"."sys_role_dept" ("role_id", "dept_id") VALUES (2, 105);
COMMIT;

-- ----------------------------
-- Table structure for sys_role_menu
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_role_menu";
CREATE TABLE "public"."sys_role_menu" (
  "role_id" int4 NOT NULL,
  "menu_id" int4 NOT NULL
)
;
ALTER TABLE "public"."sys_role_menu" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_role_menu
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 2);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 3);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 4);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 100);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 101);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 102);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 103);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 104);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 105);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 106);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 107);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 108);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 109);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 110);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 111);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 112);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 113);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 114);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 115);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 116);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 117);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 500);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 501);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1000);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1001);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1002);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1003);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1004);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1005);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1006);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1007);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1008);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1009);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1010);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1011);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1012);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1013);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1014);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1015);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1016);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1017);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1018);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1019);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1020);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1021);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1022);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1023);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1024);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1025);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1026);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1027);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1028);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1029);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1030);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1031);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1032);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1033);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1034);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1035);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1036);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1037);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1038);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1039);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1040);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1041);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1042);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1043);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1044);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1045);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1046);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1047);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1048);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1049);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1050);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1051);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1052);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1053);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1054);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1055);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1056);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1057);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1058);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1059);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1060);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 118);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 119);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1061);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1062);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1063);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1064);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1065);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1066);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1067);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1068);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1069);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1070);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 120);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1071);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1072);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1073);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1074);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1075);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1076);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1077);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (2, 1078);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 2);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 3);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 4);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 108);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 100);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 101);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 102);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 103);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 104);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 105);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 106);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 107);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 118);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 119);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 120);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 109);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 110);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 112);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 113);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 114);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 115);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 116);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 117);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 500);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 501);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1000);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1004);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1007);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1011);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1012);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1016);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1020);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1024);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1025);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1029);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1030);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1034);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1035);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1039);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1041);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1042);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1044);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1046);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1049);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1054);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1055);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1059);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1061);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1065);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1066);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1070);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1071);
INSERT INTO "public"."sys_role_menu" ("role_id", "menu_id") VALUES (3, 1076);
COMMIT;

-- ----------------------------
-- Table structure for sys_tenant
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_tenant";
CREATE TABLE "public"."sys_tenant" (
  "id" int4 NOT NULL DEFAULT nextval('sys_tenant_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "contact_user_name" varchar(50) COLLATE "pg_catalog"."default",
  "contact_phone" varchar(20) COLLATE "pg_catalog"."default",
  "company_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "license_number" varchar(50) COLLATE "pg_catalog"."default",
  "address" varchar(200) COLLATE "pg_catalog"."default",
  "intro" text COLLATE "pg_catalog"."default",
  "domain" varchar(100) COLLATE "pg_catalog"."default",
  "package_id" int4,
  "expire_time" timestamp(6),
  "account_count" int4 NOT NULL DEFAULT '-1'::integer,
  "storage_quota" int4 NOT NULL DEFAULT 10240,
  "storage_used" int4 NOT NULL DEFAULT 0,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_tenant" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_tenant
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_tenant" ("id", "tenant_id", "contact_user_name", "contact_phone", "company_name", "license_number", "address", "intro", "domain", "package_id", "expire_time", "account_count", "storage_quota", "storage_used", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (1, '000000', 'admin', '15888888888', '管理组', NULL, NULL, '系统默认租户，不可删除', NULL, NULL, NULL, -1, 10240, 0, '0', '0', 'admin', '2025-02-28 08:52:10', '', '2025-12-23 18:33:08.1474', '超级管理员租户');
COMMIT;

-- ----------------------------
-- Table structure for sys_tenant_package
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_tenant_package";
CREATE TABLE "public"."sys_tenant_package" (
  "package_id" int4 NOT NULL DEFAULT nextval('sys_tenant_package_package_id_seq'::regclass),
  "package_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "menu_ids" text COLLATE "pg_catalog"."default",
  "menu_check_strictly" bool NOT NULL DEFAULT false,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_tenant_package" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_tenant_package
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_tenant_package" ("package_id", "package_name", "menu_ids", "menu_check_strictly", "status", "del_flag", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (1, '基础套餐', '1,2,3,4,100,101,102,103,104,105,106,107,108,109,110,112,113,114,115,116,117,118,119,120,500,501,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078', 't', '0', '0', 'admin', '2025-02-28 08:52:10', '', '2025-12-23 18:33:08.141308', '基础套餐，包含所有菜单权限');
COMMIT;

-- ----------------------------
-- Table structure for sys_upload
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_upload";
CREATE TABLE "public"."sys_upload" (
  "upload_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "folder_id" int4 NOT NULL DEFAULT 0,
  "size" int4 NOT NULL,
  "file_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "new_file_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "url" varchar(500) COLLATE "pg_catalog"."default" NOT NULL,
  "ext" varchar(50) COLLATE "pg_catalog"."default",
  "mime_type" varchar(100) COLLATE "pg_catalog"."default",
  "storage_type" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'local'::character varying,
  "file_md5" varchar(32) COLLATE "pg_catalog"."default",
  "thumbnail" varchar(500) COLLATE "pg_catalog"."default",
  "parent_file_id" varchar(255) COLLATE "pg_catalog"."default",
  "version" int4 NOT NULL DEFAULT 1,
  "is_latest" bool NOT NULL DEFAULT true,
  "download_count" int4 NOT NULL DEFAULT 0,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_upload" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_upload
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for sys_user
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_user";
CREATE TABLE "public"."sys_user" (
  "user_id" int4 NOT NULL DEFAULT nextval('sys_user_user_id_seq'::regclass),
  "tenant_id" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '000000'::character varying,
  "dept_id" int4,
  "user_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "nick_name" varchar(30) COLLATE "pg_catalog"."default" NOT NULL,
  "user_type" varchar(2) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "phonenumber" varchar(11) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "sex" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "avatar" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "password" varchar(200) COLLATE "pg_catalog"."default" NOT NULL,
  "status" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "del_flag" char(1) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '0'::bpchar,
  "login_ip" varchar(128) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "login_date" timestamp(6),
  "create_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "create_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "update_by" varchar(64) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "update_time" timestamp(6) DEFAULT CURRENT_TIMESTAMP,
  "remark" varchar(500) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."sys_user" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_user
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_user" ("user_id", "tenant_id", "dept_id", "user_name", "nick_name", "user_type", "email", "phonenumber", "sex", "avatar", "password", "status", "del_flag", "login_ip", "login_date", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (1, '000000', 103, 'admin', 'Nest Admin', '00', 'admin@nestadmin.com', '15888888888', '1', '', '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS', '0', '0', '127.0.0.1', NULL, 'admin', '2025-02-28 08:52:10', '', NULL, '管理员');
INSERT INTO "public"."sys_user" ("user_id", "tenant_id", "dept_id", "user_name", "nick_name", "user_type", "email", "phonenumber", "sex", "avatar", "password", "status", "del_flag", "login_ip", "login_date", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (2, '000000', 105, 'test', 'Nest Admin Test', '00', 'test@nestadmin.com', '15666666666', '1', '', '$2b$10$UrJrjy0kxyrTO1UvhRVsvex35mB1s1jzAraIA9xtzPmlLmRtZXEXS', '0', '0', '127.0.0.1', NULL, 'admin', '2025-02-28 08:52:10', '', NULL, '测试员');
INSERT INTO "public"."sys_user" ("user_id", "tenant_id", "dept_id", "user_name", "nick_name", "user_type", "email", "phonenumber", "sex", "avatar", "password", "status", "del_flag", "login_ip", "login_date", "create_by", "create_time", "update_by", "update_time", "remark") VALUES (3, '000000', 103, 'demo', '演示账号', '00', 'demo@example.com', '13800138000', '0', '', '$2b$10$g3kM8fAzWz4LAb9bgBJAruofmfFL13xUw1QqOTdrLvouZCLbY7sVa', '0', '0', '::1', '2025-12-23 11:08:09.236', 'admin', '2025-02-28 08:52:10', '', NULL, '演示账户，密码：demo123');
COMMIT;

-- ----------------------------
-- Table structure for sys_user_post
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_user_post";
CREATE TABLE "public"."sys_user_post" (
  "user_id" int4 NOT NULL,
  "post_id" int4 NOT NULL
)
;
ALTER TABLE "public"."sys_user_post" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_user_post
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_user_post" ("user_id", "post_id") VALUES (1, 1);
INSERT INTO "public"."sys_user_post" ("user_id", "post_id") VALUES (2, 2);
INSERT INTO "public"."sys_user_post" ("user_id", "post_id") VALUES (3, 1);
COMMIT;

-- ----------------------------
-- Table structure for sys_user_role
-- ----------------------------
DROP TABLE IF EXISTS "public"."sys_user_role";
CREATE TABLE "public"."sys_user_role" (
  "user_id" int4 NOT NULL,
  "role_id" int4 NOT NULL
)
;
ALTER TABLE "public"."sys_user_role" OWNER TO "postgres";

-- ----------------------------
-- Records of sys_user_role
-- ----------------------------
BEGIN;
INSERT INTO "public"."sys_user_role" ("user_id", "role_id") VALUES (1, 1);
INSERT INTO "public"."sys_user_role" ("user_id", "role_id") VALUES (2, 2);
INSERT INTO "public"."sys_user_role" ("user_id", "role_id") VALUES (3, 3);
COMMIT;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."gen_table_column_column_id_seq"
OWNED BY "public"."gen_table_column"."column_id";
SELECT setval('"public"."gen_table_column_column_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."gen_table_table_id_seq"
OWNED BY "public"."gen_table"."table_id";
SELECT setval('"public"."gen_table_table_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_client_id_seq"
OWNED BY "public"."sys_client"."id";
SELECT setval('"public"."sys_client_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_config_config_id_seq"
OWNED BY "public"."sys_config"."config_id";
SELECT setval('"public"."sys_config_config_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_dept_dept_id_seq"
OWNED BY "public"."sys_dept"."dept_id";
SELECT setval('"public"."sys_dept_dept_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_dict_data_dict_code_seq"
OWNED BY "public"."sys_dict_data"."dict_code";
SELECT setval('"public"."sys_dict_data_dict_code_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_dict_type_dict_id_seq"
OWNED BY "public"."sys_dict_type"."dict_id";
SELECT setval('"public"."sys_dict_type_dict_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_file_folder_folder_id_seq"
OWNED BY "public"."sys_file_folder"."folder_id";
SELECT setval('"public"."sys_file_folder_folder_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_job_job_id_seq"
OWNED BY "public"."sys_job"."job_id";
SELECT setval('"public"."sys_job_job_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_job_log_job_log_id_seq"
OWNED BY "public"."sys_job_log"."job_log_id";
SELECT setval('"public"."sys_job_log_job_log_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_logininfor_info_id_seq"
OWNED BY "public"."sys_logininfor"."info_id";
SELECT setval('"public"."sys_logininfor_info_id_seq"', 1, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_menu_menu_id_seq"
OWNED BY "public"."sys_menu"."menu_id";
SELECT setval('"public"."sys_menu_menu_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_notice_notice_id_seq"
OWNED BY "public"."sys_notice"."notice_id";
SELECT setval('"public"."sys_notice_notice_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_oper_log_oper_id_seq"
OWNED BY "public"."sys_oper_log"."oper_id";
SELECT setval('"public"."sys_oper_log_oper_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_post_post_id_seq"
OWNED BY "public"."sys_post"."post_id";
SELECT setval('"public"."sys_post_post_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_role_role_id_seq"
OWNED BY "public"."sys_role"."role_id";
SELECT setval('"public"."sys_role_role_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_tenant_id_seq"
OWNED BY "public"."sys_tenant"."id";
SELECT setval('"public"."sys_tenant_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_tenant_package_package_id_seq"
OWNED BY "public"."sys_tenant_package"."package_id";
SELECT setval('"public"."sys_tenant_package_package_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."sys_user_user_id_seq"
OWNED BY "public"."sys_user"."user_id";
SELECT setval('"public"."sys_user_user_id_seq"', 1, false);

-- ----------------------------
-- Primary Key structure for table gen_table
-- ----------------------------
ALTER TABLE "public"."gen_table" ADD CONSTRAINT "gen_table_pkey" PRIMARY KEY ("table_id");

-- ----------------------------
-- Primary Key structure for table gen_table_column
-- ----------------------------
ALTER TABLE "public"."gen_table_column" ADD CONSTRAINT "gen_table_column_pkey" PRIMARY KEY ("column_id");

-- ----------------------------
-- Indexes structure for table sys_client
-- ----------------------------
CREATE UNIQUE INDEX "sys_client_client_id_key" ON "public"."sys_client" USING btree (
  "client_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_client
-- ----------------------------
ALTER TABLE "public"."sys_client" ADD CONSTRAINT "sys_client_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table sys_config
-- ----------------------------
CREATE INDEX "sys_config_config_key_idx" ON "public"."sys_config" USING btree (
  "config_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_config_create_time_idx" ON "public"."sys_config" USING btree (
  "create_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "sys_config_tenant_id_config_key_key" ON "public"."sys_config" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "config_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_config_tenant_id_config_type_idx" ON "public"."sys_config" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "config_type" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_config_tenant_id_del_flag_status_idx" ON "public"."sys_config" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_config_tenant_id_status_idx" ON "public"."sys_config" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_config
-- ----------------------------
ALTER TABLE "public"."sys_config" ADD CONSTRAINT "sys_config_pkey" PRIMARY KEY ("config_id");

-- ----------------------------
-- Indexes structure for table sys_dept
-- ----------------------------
CREATE INDEX "sys_dept_parent_id_idx" ON "public"."sys_dept" USING btree (
  "parent_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dept_status_idx" ON "public"."sys_dept" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dept_tenant_id_del_flag_status_idx" ON "public"."sys_dept" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dept_tenant_id_parent_id_idx" ON "public"."sys_dept" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "parent_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dept_tenant_id_status_idx" ON "public"."sys_dept" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_dept
-- ----------------------------
ALTER TABLE "public"."sys_dept" ADD CONSTRAINT "sys_dept_pkey" PRIMARY KEY ("dept_id");

-- ----------------------------
-- Indexes structure for table sys_dict_data
-- ----------------------------
CREATE INDEX "sys_dict_data_dict_type_idx" ON "public"."sys_dict_data" USING btree (
  "dict_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "sys_dict_data_tenant_id_dict_type_dict_value_key" ON "public"."sys_dict_data" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "dict_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "dict_value" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dict_data_tenant_id_dict_type_status_idx" ON "public"."sys_dict_data" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "dict_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_dict_data
-- ----------------------------
ALTER TABLE "public"."sys_dict_data" ADD CONSTRAINT "sys_dict_data_pkey" PRIMARY KEY ("dict_code");

-- ----------------------------
-- Indexes structure for table sys_dict_type
-- ----------------------------
CREATE INDEX "sys_dict_type_dict_type_idx" ON "public"."sys_dict_type" USING btree (
  "dict_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "sys_dict_type_tenant_id_dict_type_key" ON "public"."sys_dict_type" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "dict_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_dict_type_tenant_id_status_idx" ON "public"."sys_dict_type" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_dict_type
-- ----------------------------
ALTER TABLE "public"."sys_dict_type" ADD CONSTRAINT "sys_dict_type_pkey" PRIMARY KEY ("dict_id");

-- ----------------------------
-- Indexes structure for table sys_file_folder
-- ----------------------------
CREATE INDEX "sys_file_folder_tenant_id_parent_id_idx" ON "public"."sys_file_folder" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "parent_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_file_folder
-- ----------------------------
ALTER TABLE "public"."sys_file_folder" ADD CONSTRAINT "sys_file_folder_pkey" PRIMARY KEY ("folder_id");

-- ----------------------------
-- Indexes structure for table sys_file_share
-- ----------------------------
CREATE INDEX "sys_file_share_share_id_share_code_idx" ON "public"."sys_file_share" USING btree (
  "share_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "share_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_file_share_upload_id_idx" ON "public"."sys_file_share" USING btree (
  "upload_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_file_share
-- ----------------------------
ALTER TABLE "public"."sys_file_share" ADD CONSTRAINT "sys_file_share_pkey" PRIMARY KEY ("share_id");

-- ----------------------------
-- Indexes structure for table sys_job
-- ----------------------------
CREATE INDEX "sys_job_invoke_target_idx" ON "public"."sys_job" USING btree (
  "invoke_target" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_job_tenant_id_status_idx" ON "public"."sys_job" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_job
-- ----------------------------
ALTER TABLE "public"."sys_job" ADD CONSTRAINT "sys_job_pkey" PRIMARY KEY ("job_id");

-- ----------------------------
-- Primary Key structure for table sys_job_log
-- ----------------------------
ALTER TABLE "public"."sys_job_log" ADD CONSTRAINT "sys_job_log_pkey" PRIMARY KEY ("job_log_id");

-- ----------------------------
-- Indexes structure for table sys_logininfor
-- ----------------------------
CREATE INDEX "sys_logininfor_login_time_idx" ON "public"."sys_logininfor" USING btree (
  "login_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_logininfor_status_idx" ON "public"."sys_logininfor" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_logininfor_tenant_id_login_time_idx" ON "public"."sys_logininfor" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "login_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_logininfor_tenant_id_status_login_time_idx" ON "public"."sys_logininfor" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "login_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_logininfor_tenant_id_user_name_login_time_idx" ON "public"."sys_logininfor" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "user_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "login_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_logininfor_user_name_idx" ON "public"."sys_logininfor" USING btree (
  "user_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_logininfor
-- ----------------------------
ALTER TABLE "public"."sys_logininfor" ADD CONSTRAINT "sys_logininfor_pkey" PRIMARY KEY ("info_id");

-- ----------------------------
-- Indexes structure for table sys_menu
-- ----------------------------
CREATE INDEX "sys_menu_parent_id_order_num_idx" ON "public"."sys_menu" USING btree (
  "parent_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "order_num" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_menu_status_idx" ON "public"."sys_menu" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_menu_tenant_id_del_flag_status_idx" ON "public"."sys_menu" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_menu_tenant_id_parent_id_idx" ON "public"."sys_menu" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "parent_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_menu_tenant_id_status_idx" ON "public"."sys_menu" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_menu
-- ----------------------------
ALTER TABLE "public"."sys_menu" ADD CONSTRAINT "sys_menu_pkey" PRIMARY KEY ("menu_id");

-- ----------------------------
-- Indexes structure for table sys_notice
-- ----------------------------
CREATE INDEX "sys_notice_create_time_idx" ON "public"."sys_notice" USING btree (
  "create_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_notice_tenant_id_create_time_idx" ON "public"."sys_notice" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "create_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_notice_tenant_id_del_flag_status_idx" ON "public"."sys_notice" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_notice_tenant_id_notice_type_idx" ON "public"."sys_notice" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "notice_type" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_notice_tenant_id_status_idx" ON "public"."sys_notice" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_notice
-- ----------------------------
ALTER TABLE "public"."sys_notice" ADD CONSTRAINT "sys_notice_pkey" PRIMARY KEY ("notice_id");

-- ----------------------------
-- Indexes structure for table sys_oper_log
-- ----------------------------
CREATE INDEX "sys_oper_log_business_type_idx" ON "public"."sys_oper_log" USING btree (
  "business_type" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_oper_name_idx" ON "public"."sys_oper_log" USING btree (
  "oper_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_oper_time_idx" ON "public"."sys_oper_log" USING btree (
  "oper_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_status_idx" ON "public"."sys_oper_log" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_tenant_id_oper_name_oper_time_idx" ON "public"."sys_oper_log" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "oper_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "oper_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_tenant_id_oper_time_idx" ON "public"."sys_oper_log" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "oper_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_oper_log_tenant_id_status_oper_time_idx" ON "public"."sys_oper_log" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "oper_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_oper_log
-- ----------------------------
ALTER TABLE "public"."sys_oper_log" ADD CONSTRAINT "sys_oper_log_pkey" PRIMARY KEY ("oper_id");

-- ----------------------------
-- Indexes structure for table sys_post
-- ----------------------------
CREATE INDEX "sys_post_dept_id_idx" ON "public"."sys_post" USING btree (
  "dept_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_post_tenant_id_del_flag_status_idx" ON "public"."sys_post" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_post_tenant_id_status_idx" ON "public"."sys_post" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_post
-- ----------------------------
ALTER TABLE "public"."sys_post" ADD CONSTRAINT "sys_post_pkey" PRIMARY KEY ("post_id");

-- ----------------------------
-- Indexes structure for table sys_role
-- ----------------------------
CREATE INDEX "sys_role_role_key_idx" ON "public"."sys_role" USING btree (
  "role_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_role_tenant_id_del_flag_status_idx" ON "public"."sys_role" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_role_tenant_id_role_key_idx" ON "public"."sys_role" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "role_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_role_tenant_id_status_idx" ON "public"."sys_role" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_role
-- ----------------------------
ALTER TABLE "public"."sys_role" ADD CONSTRAINT "sys_role_pkey" PRIMARY KEY ("role_id");

-- ----------------------------
-- Primary Key structure for table sys_role_dept
-- ----------------------------
ALTER TABLE "public"."sys_role_dept" ADD CONSTRAINT "sys_role_dept_pkey" PRIMARY KEY ("role_id", "dept_id");

-- ----------------------------
-- Indexes structure for table sys_role_menu
-- ----------------------------
CREATE INDEX "sys_role_menu_menu_id_idx" ON "public"."sys_role_menu" USING btree (
  "menu_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_role_menu_role_id_idx" ON "public"."sys_role_menu" USING btree (
  "role_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_role_menu
-- ----------------------------
ALTER TABLE "public"."sys_role_menu" ADD CONSTRAINT "sys_role_menu_pkey" PRIMARY KEY ("role_id", "menu_id");

-- ----------------------------
-- Indexes structure for table sys_tenant
-- ----------------------------
CREATE UNIQUE INDEX "sys_tenant_tenant_id_key" ON "public"."sys_tenant" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_tenant
-- ----------------------------
ALTER TABLE "public"."sys_tenant" ADD CONSTRAINT "sys_tenant_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table sys_tenant_package
-- ----------------------------
ALTER TABLE "public"."sys_tenant_package" ADD CONSTRAINT "sys_tenant_package_pkey" PRIMARY KEY ("package_id");

-- ----------------------------
-- Indexes structure for table sys_upload
-- ----------------------------
CREATE INDEX "sys_upload_file_md5_del_flag_idx" ON "public"."sys_upload" USING btree (
  "file_md5" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_upload_parent_file_id_version_idx" ON "public"."sys_upload" USING btree (
  "parent_file_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "version" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_upload_tenant_id_folder_id_idx" ON "public"."sys_upload" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "folder_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_upload
-- ----------------------------
ALTER TABLE "public"."sys_upload" ADD CONSTRAINT "sys_upload_pkey" PRIMARY KEY ("upload_id");

-- ----------------------------
-- Indexes structure for table sys_user
-- ----------------------------
CREATE INDEX "sys_user_dept_id_idx" ON "public"."sys_user" USING btree (
  "dept_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_email_idx" ON "public"."sys_user" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_phonenumber_idx" ON "public"."sys_user" USING btree (
  "phonenumber" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_status_idx" ON "public"."sys_user" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_create_time_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "create_time" "pg_catalog"."timestamp_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_del_flag_status_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "del_flag" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_email_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_phonenumber_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "phonenumber" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_status_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."bpchar_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_tenant_id_user_name_idx" ON "public"."sys_user" USING btree (
  "tenant_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "user_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "sys_user_user_name_idx" ON "public"."sys_user" USING btree (
  "user_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_user
-- ----------------------------
ALTER TABLE "public"."sys_user" ADD CONSTRAINT "sys_user_pkey" PRIMARY KEY ("user_id");

-- ----------------------------
-- Indexes structure for table sys_user_post
-- ----------------------------
CREATE INDEX "sys_user_post_post_id_idx" ON "public"."sys_user_post" USING btree (
  "post_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_user_post
-- ----------------------------
ALTER TABLE "public"."sys_user_post" ADD CONSTRAINT "sys_user_post_pkey" PRIMARY KEY ("user_id", "post_id");

-- ----------------------------
-- Indexes structure for table sys_user_role
-- ----------------------------
CREATE INDEX "sys_user_role_role_id_idx" ON "public"."sys_user_role" USING btree (
  "role_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sys_user_role
-- ----------------------------
ALTER TABLE "public"."sys_user_role" ADD CONSTRAINT "sys_user_role_pkey" PRIMARY KEY ("user_id", "role_id");

-- ----------------------------
-- Foreign Keys structure for table gen_table_column
-- ----------------------------
ALTER TABLE "public"."gen_table_column" ADD CONSTRAINT "gen_table_column_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "public"."gen_table" ("table_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table sys_file_share
-- ----------------------------
ALTER TABLE "public"."sys_file_share" ADD CONSTRAINT "sys_file_share_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "public"."sys_upload" ("upload_id") ON DELETE CASCADE ON UPDATE CASCADE;
