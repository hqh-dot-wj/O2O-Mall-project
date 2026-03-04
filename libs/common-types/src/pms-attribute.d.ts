/**
 * PMS 属性模板 API 类型
 * OpenAPI 未完整定义 attribute 相关 schema，此处与后端 VO/DTO 对齐
 */
export type AttrUsageType = 'PARAM' | 'SPEC';
export type AttrInputType = 0 | 1; // 0=INPUT, 1=SELECT
export type AttrApplyType = 0 | 1 | 2; // 0=COMMON, 1=REAL, 2=SERVICE

export interface AttributeItemVo {
  attrId?: number;
  name: string;
  usageType: AttrUsageType;
  applyType: AttrApplyType;
  inputType: AttrInputType;
  inputList?: string;
  sort: number;
}

export interface AttributeTemplateVo {
  templateId: number;
  name: string;
  attributes?: AttributeItemVo[];
  _count?: { attributes: number };
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
}

export interface AttributeSearchParams {
  pageNum?: number;
  pageSize?: number;
  orderByColumn?: string;
  isAsc?: 'asc' | 'desc';
  name?: string | null;
}

export interface AttributeOperateParams {
  templateId?: number;
  name: string;
  attributes: AttributeItemVo[];
}
