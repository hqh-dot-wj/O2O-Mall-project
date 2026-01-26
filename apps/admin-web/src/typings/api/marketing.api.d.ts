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

    type PlayTemplateCreate = Pick<PlayTemplate, 'name' | 'code' | 'unitName' | 'ruleSchema' | 'uiComponentId'>;
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
  }
}
