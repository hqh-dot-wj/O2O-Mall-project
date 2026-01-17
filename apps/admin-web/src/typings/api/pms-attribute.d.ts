declare namespace Api {
    namespace Pms {
        type AttrUsageType = 'PARAM' | 'SPEC';
        // 0=INPUT, 1=SELECT from backend enum
        type AttrInputType = 0 | 1;
        // 0=COMMON, 1=REAL, 2=SERVICE from backend enum
        type AttrApplyType = 0 | 1 | 2;

        interface AttributeItem {
            attrId?: number;
            name: string;
            usageType: AttrUsageType;
            applyType: AttrApplyType;
            inputType: AttrInputType;
            inputList?: string;
            sort: number;
        }

        type AttributeTemplate = Common.CommonRecord<{
            templateId: number;
            name: string;
            attributes?: AttributeItem[];
            _count?: {
                attributes: number;
            };
        }>;

        type AttributeTemplateList = Common.PaginatingQueryRecord<AttributeTemplate>;

        interface AttributeSearchParams extends Common.CommonSearchParams {
            name?: string | null;
        }

        interface AttributeOperateParams {
            templateId?: number;
            name: string;
            attributes: AttributeItem[];
        }
    }
}
