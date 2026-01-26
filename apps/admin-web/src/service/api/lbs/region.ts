import { request } from '@/service/request';

/**
 * Get region children list
 * @param parentId - The parent region code. If undefined, returns provinces (level 1).
 */
export function fetchRegionList(parentId?: string) {
  return request<any[]>({
    url: '/lbs/region/list',
    method: 'get',
    params: { parentId }
  });
}
