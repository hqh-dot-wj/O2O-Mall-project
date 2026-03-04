/**
 * Api.Pms 属性 - 来自 @libs/common-types
 */
import type {
  AttrApplyType as AttrApplyTypeT,
  AttrInputType as AttrInputTypeT,
  AttrUsageType as AttrUsageTypeT,
  AttributeItemVo,
  AttributeOperateParams as AttributeOperateParamsT,
  AttributeSearchParams as AttributeSearchParamsT,
  AttributeTemplateVo
} from '@libs/common-types';

declare namespace Api {
  namespace Pms {
    type AttrUsageType = AttrUsageTypeT;
    type AttrInputType = AttrInputTypeT;
    type AttrApplyType = AttrApplyTypeT;
    type AttributeItem = AttributeItemVo;
    type AttributeTemplate = AttributeTemplateVo & Partial<Api.Common.CommonRecord>;
    type AttributeTemplateList = Api.Common.PaginatingQueryRecord<AttributeTemplate>;
    type AttributeSearchParams = AttributeSearchParamsT;
    type AttributeOperateParams = AttributeOperateParamsT;
  }
}
