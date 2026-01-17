declare namespace Api {
  namespace Pms {
    type Category = Common.CommonRecord<{
      catId: number;
      parentId?: number | null;
      name: string;
      level: number;
      icon?: string;
      sort: number;
      children?: Category[];
      bindType: 'REAL' | 'SERVICE' | null;
      attrTemplateId?: number | null;
      attrTemplate?: { name: string };
    }>;

    type CategoryTree = Category[];

    type CategoryList = Common.PaginatingQueryRecord<Category>;

    interface CategorySearchParams extends Common.CommonSearchParams {
      name?: string | null;
      parentId?: number | null;
      deptId?: string | null;
    }

    interface CategoryOperateParams {
      catId?: number;
      parentId?: number | null;
      name: string;
      level: number;
      icon?: string;
      sort: number;
      bindType?: 'REAL' | 'SERVICE' | null;
      attrTemplateId?: number | null;
    }
  }
}
