declare namespace Api {
  namespace Pms {
    type Brand = Common.CommonRecord<{
      brandId: number;
      name: string;
      logo?: string;
    }>;

    type BrandList = Common.PaginatingQueryRecord<Brand>;

    interface BrandSearchParams extends Common.CommonSearchParams {
      name?: string | null;
    }

    interface BrandOperateParams {
      brandId?: number;
      name: string;
      logo?: string;
    }
  }
}
