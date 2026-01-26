import { request } from '@/service/request';

/** 营销API - 玩法模板 */
export function fetchGetTemplateList(params?: Api.Marketing.PlayTemplateSearchParams) {
  return request<Api.Marketing.PlayTemplateList>({
    url: '/marketing/template/list',
    method: 'get',
    params
  });
}

export function fetchCreateTemplate(data: Api.Marketing.PlayTemplateCreate) {
  return request<Api.Marketing.PlayTemplate>({
    url: '/marketing/template',
    method: 'post',
    data
  });
}

export function fetchUpdateTemplate(id: string, data: Api.Marketing.PlayTemplateUpdate) {
  return request<Api.Marketing.PlayTemplate>({
    url: `/marketing/template/${id}`,
    method: 'put',
    data
  });
}

export function fetchDeleteTemplate(id: string) {
  return request({
    url: `/marketing/template/${id}`,
    method: 'delete'
  });
}
