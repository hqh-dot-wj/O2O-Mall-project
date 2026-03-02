import 'reflect-metadata';
import { UserAssetController } from './asset/asset.controller';
import { StorePlayConfigController } from './config/config.controller';
import { CouponDistributionController } from './coupon/distribution/distribution.controller';
import { CouponManagementController } from './coupon/management/management.controller';
import { CouponTemplateController } from './coupon/template/template.controller';
import { PlayInstanceController } from './instance/instance.controller';
import { PlayController } from './play/play.controller';
import { PointsAccountAdminController } from './points/account/account.controller';
import { PointsManagementController } from './points/management/management.controller';
import { PointsRuleController } from './points/rule/rule.controller';
import { PointsTaskAdminController } from './points/task/task.controller';
import { RuleController } from './rule/rule.controller';
import { PlayTemplateController } from './template/template.controller';

describe('MarketingControllerDecorators', () => {
  const permissionCases: Array<{ controller: any; method: string; permission: string }> = [
    { controller: UserAssetController, method: 'findAll', permission: 'marketing:asset:list' },
    { controller: UserAssetController, method: 'findOne', permission: 'marketing:asset:query' },
    { controller: UserAssetController, method: 'consume', permission: 'marketing:asset:consume' },
    { controller: StorePlayConfigController, method: 'findAll', permission: 'marketing:config:list' },
    { controller: StorePlayConfigController, method: 'findOne', permission: 'marketing:config:query' },
    { controller: StorePlayConfigController, method: 'create', permission: 'marketing:config:add' },
    { controller: StorePlayConfigController, method: 'update', permission: 'marketing:config:edit' },
    { controller: StorePlayConfigController, method: 'updateStatus', permission: 'marketing:config:status' },
    { controller: StorePlayConfigController, method: 'delete', permission: 'marketing:config:delete' },
    { controller: StorePlayConfigController, method: 'getRulesHistory', permission: 'marketing:config:history' },
    { controller: StorePlayConfigController, method: 'rollbackToVersion', permission: 'marketing:config:rollback' },
    { controller: StorePlayConfigController, method: 'compareVersions', permission: 'marketing:config:compare' },
    { controller: CouponDistributionController, method: 'distributeManually', permission: 'marketing:coupon:distribute' },
    { controller: CouponManagementController, method: 'getUserCoupons', permission: 'marketing:coupon:user-coupon:list' },
    { controller: CouponManagementController, method: 'getUsageRecords', permission: 'marketing:coupon:usage-record:list' },
    { controller: CouponManagementController, method: 'getStatistics', permission: 'marketing:coupon:statistics:query' },
    { controller: CouponManagementController, method: 'exportUsageRecords', permission: 'marketing:coupon:usage-record:export' },
    { controller: CouponTemplateController, method: 'findAll', permission: 'marketing:coupon:template:list' },
    { controller: CouponTemplateController, method: 'findOne', permission: 'marketing:coupon:template:query' },
    { controller: CouponTemplateController, method: 'create', permission: 'marketing:coupon:template:add' },
    { controller: CouponTemplateController, method: 'update', permission: 'marketing:coupon:template:edit' },
    { controller: CouponTemplateController, method: 'updateStatus', permission: 'marketing:coupon:template:status' },
    { controller: CouponTemplateController, method: 'deactivate', permission: 'marketing:coupon:template:delete' },
    { controller: PlayInstanceController, method: 'findAll', permission: 'marketing:instance:list' },
    { controller: PlayInstanceController, method: 'findOne', permission: 'marketing:instance:query' },
    { controller: PlayInstanceController, method: 'create', permission: 'marketing:instance:add' },
    { controller: PlayInstanceController, method: 'updateStatus', permission: 'marketing:instance:status' },
    { controller: PlayController, method: 'getAllPlayTypes', permission: 'marketing:play:type:list' },
    { controller: PlayController, method: 'getPlayType', permission: 'marketing:play:type:query' },
    { controller: PlayController, method: 'checkPlayExists', permission: 'marketing:play:type:query' },
    { controller: PlayController, method: 'getPlayFeatures', permission: 'marketing:play:type:query' },
    { controller: PlayController, method: 'getCourseSchedules', permission: 'marketing:play:course:query' },
    { controller: PlayController, method: 'getCourseAttendances', permission: 'marketing:play:course:query' },
    { controller: PlayController, method: 'markAttendance', permission: 'marketing:play:course:attendance' },
    { controller: PlayController, method: 'getAttendanceRate', permission: 'marketing:play:course:query' },
    { controller: PointsAccountAdminController, method: 'adjustPoints', permission: 'marketing:points:adjust' },
    { controller: PointsAccountAdminController, method: 'getAccounts', permission: 'marketing:points:account:list' },
    { controller: PointsAccountAdminController, method: 'getTransactions', permission: 'marketing:points:transaction:list' },
    { controller: PointsManagementController, method: 'getEarnStatistics', permission: 'marketing:points:statistics:earn' },
    { controller: PointsManagementController, method: 'getUseStatistics', permission: 'marketing:points:statistics:use' },
    { controller: PointsManagementController, method: 'getBalanceStatistics', permission: 'marketing:points:statistics:balance' },
    { controller: PointsManagementController, method: 'getExpireStatistics', permission: 'marketing:points:statistics:expire' },
    { controller: PointsManagementController, method: 'getRanking', permission: 'marketing:points:ranking:list' },
    { controller: PointsManagementController, method: 'exportTransactions', permission: 'marketing:points:transaction:export' },
    { controller: PointsRuleController, method: 'getRules', permission: 'marketing:points:rule:query' },
    { controller: PointsRuleController, method: 'updateRules', permission: 'marketing:points:rule:edit' },
    { controller: PointsTaskAdminController, method: 'createTask', permission: 'marketing:points:task:add' },
    { controller: PointsTaskAdminController, method: 'updateTask', permission: 'marketing:points:task:edit' },
    { controller: PointsTaskAdminController, method: 'findAll', permission: 'marketing:points:task:list' },
    { controller: PointsTaskAdminController, method: 'deleteTask', permission: 'marketing:points:task:delete' },
    { controller: RuleController, method: 'validateRule', permission: 'marketing:rule:validate' },
    { controller: RuleController, method: 'getRuleFormSchema', permission: 'marketing:rule:schema:query' },
    { controller: PlayTemplateController, method: 'findAll', permission: 'marketing:template:list' },
    { controller: PlayTemplateController, method: 'findOne', permission: 'marketing:template:query' },
    { controller: PlayTemplateController, method: 'create', permission: 'marketing:template:add' },
    { controller: PlayTemplateController, method: 'update', permission: 'marketing:template:edit' },
    { controller: PlayTemplateController, method: 'delete', permission: 'marketing:template:delete' },
  ];

  const operlogCases: Array<{ controller: any; method: string }> = [
    { controller: UserAssetController, method: 'consume' },
    { controller: StorePlayConfigController, method: 'create' },
    { controller: StorePlayConfigController, method: 'update' },
    { controller: StorePlayConfigController, method: 'updateStatus' },
    { controller: StorePlayConfigController, method: 'delete' },
    { controller: StorePlayConfigController, method: 'rollbackToVersion' },
    { controller: CouponDistributionController, method: 'distributeManually' },
    { controller: CouponTemplateController, method: 'create' },
    { controller: CouponTemplateController, method: 'update' },
    { controller: CouponTemplateController, method: 'updateStatus' },
    { controller: CouponTemplateController, method: 'deactivate' },
    { controller: PlayInstanceController, method: 'create' },
    { controller: PlayInstanceController, method: 'updateStatus' },
    { controller: PlayController, method: 'markAttendance' },
    { controller: PointsAccountAdminController, method: 'adjustPoints' },
    { controller: PointsRuleController, method: 'updateRules' },
    { controller: PointsTaskAdminController, method: 'createTask' },
    { controller: PointsTaskAdminController, method: 'updateTask' },
    { controller: PointsTaskAdminController, method: 'deleteTask' },
    { controller: RuleController, method: 'validateRule' },
    { controller: PlayTemplateController, method: 'create' },
    { controller: PlayTemplateController, method: 'update' },
    { controller: PlayTemplateController, method: 'delete' },
  ];

  // R-PRE-CTRL-01
  it('Given marketing controllers, When 读取 permission 元数据, Then 权限标识应与预期一致', () => {
    for (const item of permissionCases) {
      const permission = Reflect.getMetadata('permission', item.controller.prototype[item.method]);
      expect(permission).toBe(item.permission);
    }
  });

  // R-LOG-CTRL-01
  it('Given marketing 写接口, When 读取 operlog 元数据, Then 应存在操作日志配置', () => {
    for (const item of operlogCases) {
      const operlog = Reflect.getMetadata('operlog', item.controller.prototype[item.method]);
      expect(operlog).toBeDefined();
    }
  });
});
