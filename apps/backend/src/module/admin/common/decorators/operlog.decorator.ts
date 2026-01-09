import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { OperlogInterceptor } from '../interceptors/operlog.interceptor';
import { BusinessType } from 'src/common/constant/business.constant';

export type OperlogConfig =
  | Partial<{
    businessType?: (typeof BusinessType)[keyof Omit<typeof BusinessType, 'prototype'>];
  }>
  | undefined;

export const Operlog = (logConfig?: OperlogConfig) => {
  return applyDecorators(SetMetadata('operlog', logConfig), UseInterceptors(OperlogInterceptor));
};
