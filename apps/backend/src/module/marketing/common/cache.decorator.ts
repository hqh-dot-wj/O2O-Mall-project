import { SetMetadata } from '@nestjs/common';

/**
 * 缓存装饰器元数据键
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * 缓存装饰器
 * 
 * @description 用于标记需要缓存的方法
 * @param key 缓存键前缀
 * @param ttl 缓存过期时间（秒），默认300秒
 * 
 * @example
 * ```typescript
 * @Cacheable('coupon:template', 600)
 * async findById(id: string) {
 *   return this.repo.findById(id);
 * }
 * ```
 */
export const Cacheable = (key: string, ttl: number = 300) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * 缓存失效装饰器
 * 
 * @description 用于标记需要清除缓存的方法
 * @param keys 需要清除的缓存键前缀数组
 * 
 * @example
 * ```typescript
 * @CacheEvict(['coupon:template'])
 * async updateTemplate(id: string, dto: UpdateDto) {
 *   return this.repo.update(id, dto);
 * }
 * ```
 */
export const CacheEvict = (keys: string[]) => {
  return SetMetadata('cache:evict', keys);
};
