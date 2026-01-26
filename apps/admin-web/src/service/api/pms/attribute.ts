import { request } from '../../request';

/** get attribute template list */
export function fetchGetAttributeList(params?: Api.Pms.AttributeSearchParams) {
  return request<Api.Pms.AttributeTemplateList>({
    url: '/pms/attribute/template/list',
    method: 'get',
    params
  });
}

/** get attribute template detail */
export function fetchGetAttribute(id: number) {
  return request<Api.Pms.AttributeTemplate>({
    url: `/pms/attribute/template/${id}`,
    method: 'get'
  });
}

/** create attribute template */
export function fetchCreateAttribute(data: Api.Pms.AttributeOperateParams) {
  return request<Api.Pms.AttributeTemplate>({
    url: '/pms/attribute/template',
    method: 'post',
    data
  });
}

/** update attribute template */
export function fetchUpdateAttribute(id: number, data: Api.Pms.AttributeOperateParams) {
  return request<Api.Pms.AttributeTemplate>({
    url: `/pms/attribute/template/${id}`,
    method: 'put',
    data
  });
}

/** delete attribute template */
export function fetchDeleteAttribute(id: number) {
  return request<any>({
    url: `/pms/attribute/template/${id}`,
    method: 'delete'
  });
}

/** get attributes by category id */
export function fetchGetAttributesByCategory(catId: number) {
  return request<Api.Pms.AttributeItem[]>({
    url: `/pms/attribute/category/${catId}`,
    method: 'get'
  });
}
