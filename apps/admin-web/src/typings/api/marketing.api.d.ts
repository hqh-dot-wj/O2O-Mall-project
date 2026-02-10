declare namespace Api {
  namespace Marketing {
    interface PlayTemplate {
      id: string;
      code: string;
      name: string;
      unitName: string;
      ruleSchema: { fields: SchemaField[] };
      uiComponentId?: string;
      status: string;
      createTime: string;
      // 关联商品/规格字段
      productId?: string;
      skuId?: string;
      productName?: string;
    }

    interface SchemaField {
      key: string;
      label: string;
      type: 'number' | 'string' | 'boolean' | 'datetime';
      required: boolean;
      defaultValue?: any;
    }

    type PlayTemplateSearchParams = CommonType.RecordNullable<
      {
        name?: string;
        code?: string;
      } & Common.CommonSearchParams
    >;

    type PlayTemplateCreate = Pick<
      PlayTemplate,
      'name' | 'code' | 'unitName' | 'ruleSchema' | 'uiComponentId' | 'productId' | 'skuId' | 'productName'
    >;
    type PlayTemplateUpdate = Partial<PlayTemplateCreate>;

    type PlayTemplateList = Common.PaginatingQueryRecord<PlayTemplate>;

    // Store Config
    interface StoreConfig {
      id: string;
      storeId: string;
      serviceId: string;
      serviceType: 'REAL' | 'SERVICE';
      templateCode: string;
      rules: Record<string, any>;
      stockMode: 'STRONG_LOCK' | 'LAZY_CHECK';
      status: 'OFF_SHELF' | 'ON_SHELF';
      createTime: string;
      // 扩展字段 (由 Service 层聚合)
      productName?: string;
      productStatus?: string;
      ruleName?: string;
    }

    type StoreConfigSearchParams = CommonType.RecordNullable<
      {
        storeId: string;
        templateCode?: string;
        status?: string;
      } & Common.CommonSearchParams
    >;

    interface StoreConfigCreate {
      storeId: string;
      serviceId: string;
      serviceType: string;
      templateCode: string;
      rules: Record<string, any>;
      stockMode: string;
      status?: string;
    }

    type StoreConfigUpdate = Partial<StoreConfigCreate>;

    type StoreConfigList = Common.PaginatingQueryRecord<StoreConfig>;

    // User Asset
    interface UserAsset {
      id: string;
      memberId: string;
      instanceId: string;
      assetName: string;
      assetType: 'VOUCHER' | 'TIMES_CARD';
      balance: number;
      status: 'UNUSED' | 'USED' | 'EXPIRED' | 'FROZEN';
      expireTime?: string;
      createTime: string;
    }

    type UserAssetSearchParams = CommonType.RecordNullable<
      {
        memberId?: string;
        status?: string;
      } & Common.CommonSearchParams
    >;

    type UserAssetList = Common.PaginatingQueryRecord<UserAsset>;

    // Settlement
    interface SettlementRequest {
      id: string;
      storeId: string;
      applyAmount: number;
      orderCount: number;
      status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FINISHED';
      auditBy?: string;
      auditTime?: string;
      auditRemark?: string;
      createTime: string;
    }

    type SettlementSearchParams = CommonType.RecordNullable<
      {
        storeId?: string;
        status?: string;
      } & Common.CommonSearchParams
    >;

    interface SettlementApply {
      storeId: string;
      applyAmount: number;
      orderCount: number;
      attachment?: string;
    }

    interface SettlementAudit {
      status: 'APPROVED' | 'REJECTED';
      remark?: string;
    }

    type SettlementList = Common.PaginatingQueryRecord<SettlementRequest>;

    // Coupon Template（与后端 GET 列表/详情 返回字段一致）
    interface CouponTemplate {
      id: string;
      name: string;
      description?: string;
      /** 优惠券类型: DISCOUNT-代金券, PERCENTAGE-折扣券, EXCHANGE-兑换券 */
      type: 'DISCOUNT' | 'PERCENTAGE' | 'EXCHANGE';
      discountAmount?: number;
      discountPercent?: number;
      minOrderAmount: number;
      validityType?: 'FIXED' | 'RELATIVE';
      validDays?: number;
      startTime?: string | Date;
      endTime?: string | Date;
      totalStock: number;
      remainingStock?: number;
      limitPerUser: number;
      distributedCount?: number;
      usedCount?: number;
      usageRate?: number;
      status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
      createTime?: string;
      updateTime?: string;
      // 兼容旧字段名
      code?: string;
      value?: number;
      minAmount?: number;
      totalCount?: number;
      limitPerPerson?: number;
      drawnCount?: number;
      validStartTime?: string;
      validEndTime?: string;
    }

    type CouponTemplateSearchParams = CommonType.RecordNullable<
      {
        name?: string;
        type?: string;
        status?: string;
      } & Common.CommonSearchParams
    >;

    /** 创建/更新时使用，与后端 DTO 一致 */
    type CouponTemplateCreate = {
      name: string;
      description?: string;
      type: 'DISCOUNT' | 'PERCENTAGE' | 'EXCHANGE';
      discountAmount?: number;
      discountPercent?: number;
      minOrderAmount?: number;
      validityType: 'FIXED' | 'RELATIVE';
      startTime?: string;
      endTime?: string;
      validDays?: number;
      totalStock: number;
      limitPerUser?: number;
      applicableProducts?: string[];
      applicableCategories?: number[];
      memberLevels?: number[];
      tenantId?: string;
      createBy?: string;
    };

    type CouponTemplateUpdate = Partial<CouponTemplateCreate>;

    type CouponTemplateList = Common.PaginatingQueryRecord<CouponTemplate>;

    /** User coupon (issued to member) */
    interface UserCoupon {
      id: string;
      templateId: string;
      memberId: string;
      couponName?: string;
      couponType?: string;
      discountAmount?: number;
      discountPercent?: number;
      status: 'UNUSED' | 'USED' | 'EXPIRED' | 'LOCKED';
      distributionType?: 'MANUAL' | 'ACTIVITY' | 'ORDER';
      receiveTime?: string;
      usedTime?: string;
      orderId?: string;
      createTime?: string;
      templateName?: string;
      value?: number;
      type?: string;
    }

    /** Coupon usage record */
    interface CouponUsageRecord {
      id: string;
      userCouponId: string;
      templateId: string;
      memberId: string;
      orderId: string;
      usedTime: string;
      createTime: string;
      templateName?: string;
      nickname?: string;
      mobile?: string;
    }

    // Points Rule Config (与后端 MktPointsRule / PointsRuleVo 一致)
    interface PointsRule {
      id?: string;
      tenantId?: string;
      /** 是否启用消费积分 */
      orderPointsEnabled: boolean;
      /** 消费积分比例: 每消费 N 元获得 M 积分 */
      orderPointsRatio: number;
      /** 消费积分基数: N 元 */
      orderPointsBase: number;
      /** 是否启用签到积分 */
      signinPointsEnabled: boolean;
      /** 签到积分数量 */
      signinPointsAmount: number;
      /** 是否启用积分有效期 */
      pointsValidityEnabled: boolean;
      /** 积分有效天数, null 表示永久有效 */
      pointsValidityDays: number | null;
      /** 是否启用积分抵扣 */
      pointsRedemptionEnabled: boolean;
      /** 积分抵扣比例: N 积分抵扣 M 元 */
      pointsRedemptionRatio: number;
      /** 积分抵扣基数: M 元 */
      pointsRedemptionBase: number;
      /** 单笔订单最多可使用积分数量 */
      maxPointsPerOrder: number | null;
      /** 单笔订单最多可抵扣百分比 (1-100) */
      maxDiscountPercentOrder: number | null;
      /** 系统开关 */
      systemEnabled: boolean;
      createBy?: string;
      createTime?: string;
      updateBy?: string | null;
      updateTime?: string;
    }

    type PointsRuleUpdate = Partial<
      Omit<PointsRule, 'id' | 'tenantId' | 'createBy' | 'createTime' | 'updateBy' | 'updateTime'>
    >;

    /** Points Task（与后端 mkt_points_task / PointsTaskVo 一致） */
    interface PointTask {
      id: string;
      tenantId?: string;
      /** 任务唯一标识 */
      taskKey: string;
      /** 任务名称 */
      taskName: string;
      /** 任务描述 */
      taskDescription: string | null;
      /** 积分奖励 */
      pointsReward: number;
      /** 完成条件（JSON） */
      completionCondition?: any;
      /** 是否可重复完成 */
      isRepeatable: boolean;
      /** 最多完成次数 */
      maxCompletions: number | null;
      /** 是否启用 */
      isEnabled: boolean;
      createBy?: string;
      createTime: string;
      updateBy?: string | null;
      updateTime?: string;
    }

    type PointTaskSearchParams = Common.PaginatingCommonParams & {
      isEnabled?: boolean;
    };

    type PointTaskList = Common.PaginatingQueryRecord<PointTask>;

    /** 创建任务（与 CreatePointsTaskDto 一致） */
    type PointTaskCreate = {
      taskKey: string;
      taskName: string;
      taskDescription?: string;
      pointsReward: number;
      completionCondition?: any;
      isRepeatable?: boolean;
      maxCompletions?: number;
      isEnabled?: boolean;
    };

    /** 更新任务（与 UpdatePointsTaskDto 一致） */
    type PointTaskUpdate = {
      taskName?: string;
      taskDescription?: string;
      pointsReward?: number;
      completionCondition?: any;
      isRepeatable?: boolean;
      maxCompletions?: number;
      isEnabled?: boolean;
    };

    /** Points account (admin list) */
    interface PointsAccount {
      id: string;
      memberId: string;
      totalPoints: number;
      availablePoints: number;
      frozenPoints: number;
      usedPoints: number;
      expiredPoints: number;
      createTime: string;
      member?: { memberId: string; nickname?: string; mobile?: string; avatar?: string };
    }

    /** Points transaction */
    interface PointsTransaction {
      id: string;
      memberId: string;
      type: string;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      remark?: string;
      createTime: string;
    }

    type PointsTransactionSearchParams = {
      memberId?: string;
      type?: string;
      startTime?: string;
      endTime?: string;
      pageNum?: number;
      pageSize?: number;
    };

    interface PointsEarnStatistics {
      total?: number;
      trend?: { date: string; amount: number }[];
    }

    interface PointsUseStatistics {
      total?: number;
      trend?: { date: string; amount: number }[];
    }

    interface PointsBalanceStatistics {
      totalBalance?: number;
      accountCount?: number;
    }

    interface PointsRankingItem {
      memberId: string;
      nickname?: string;
      availablePoints: number;
      rank?: number;
    }

    /** Marketing Statistics */
    interface CouponStatistics {
      templateCount?: number;
      totalDistributed: number;
      totalUsed: number;
      totalExpired: number;
      useRate: number;
      totalDiscountAmount?: number;
      trend: {
        date: string;
        distributed: number;
        used: number;
      }[];
    }

    interface PointsStatistics {
      totalEarned: number;
      totalSpent: number;
      totalExpired: number;
      topEarners: {
        nickname: string;
        points: number;
      }[];
      trend: {
        date: string;
        earned: number;
        spent: number;
      }[];
    }
  }
}
