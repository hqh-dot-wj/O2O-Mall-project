import { reactive } from 'vue';

export interface ProductForm {
  categoryId: number | null;
  name: string;
  type: 'REAL' | 'SERVICE';

  // Real fields
  weight: number;
  isFreeShip: boolean;

  // Service fields
  serviceDuration: number;
  serviceRadius: number;

  // Spec Definitions (for Step 3)
  // Structure: [{ name: 'Color', values: ['Red', 'Blue'] }]
  specDef: Array<{ name: string; values: string[] }>;

  // Generated SKUs
  skus: Array<Api.Pms.GlobalSkuOperate>;

  // Dynamic Attributes (for Step 4)
  // Structure: [{ attrId: 1, value: 'Wood' }]
  attrs: Array<{ attrId: number; value: string }>;

  // Other Common Fields
  brandId?: number;
  subTitle?: string;
  description?: string;
  detailHtml?: string;
  pic?: string;
  albumPics?: string[];
  publishStatus?: string;
  sort?: number;
}

export function createFormModel(): ProductForm {
  return reactive({
    categoryId: null,
    name: '',
    type: 'REAL',
    weight: 0,
    isFreeShip: false,
    serviceDuration: 60,
    serviceRadius: 0,
    specDef: [],
    skus: [],
    attrs: [],
    // Defaults
    brandId: undefined,
    subTitle: '',
    description: '',
    detailHtml: '',
    pic: '',
    albumPics: [],
    publishStatus: '1', // Default On Shelf
    sort: 0
  });
}
