import { describe, expect, it, vi } from 'vitest';
import {
  fetchCreateAttribute,
  fetchDeleteAttribute,
  fetchGetAttribute,
  fetchGetAttributeList,
  fetchGetAttributesByCategory,
  fetchUpdateAttribute
} from './attribute';

// Mock request
vi.mock('@/service/request', () => ({
  request: vi.fn((config: object) => Promise.resolve({ data: config }))
}));

describe('PMS Attribute API', () => {
  it('fetchGetAttributeList should have correct config', async () => {
    const res = await fetchGetAttributeList();
    expect(res.data).toMatchObject({
      url: '/admin/pms/attribute/template/list',
      method: 'get'
    });
  });

  it('fetchGetAttributeList should pass params when provided', async () => {
    const params: Api.Pms.AttributeSearchParams = { pageNum: 1, pageSize: 10, name: 'Test' };
    const res = await fetchGetAttributeList(params);
    expect(res.data).toMatchObject({
      url: '/admin/pms/attribute/template/list',
      method: 'get',
      params
    });
  });

  it('fetchGetAttribute should have correct config', async () => {
    const id = 1;
    const res = await fetchGetAttribute(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/attribute/template/${id}`,
      method: 'get'
    });
  });

  it('fetchCreateAttribute should have correct config', async () => {
    const data: Api.Pms.AttributeOperateParams = { name: 'NewTemplate', attributes: [] };
    const res = await fetchCreateAttribute(data);
    expect(res.data).toMatchObject({
      url: '/admin/pms/attribute/template',
      method: 'post',
      data
    });
  });

  it('fetchUpdateAttribute should have correct config', async () => {
    const id = 1;
    const data: Api.Pms.AttributeOperateParams = { name: 'UpdatedTemplate', attributes: [] };
    const res = await fetchUpdateAttribute(id, data);
    expect(res.data).toMatchObject({
      url: `/admin/pms/attribute/template/${id}`,
      method: 'put',
      data
    });
  });

  it('fetchDeleteAttribute should have correct config', async () => {
    const id = 1;
    const res = await fetchDeleteAttribute(id);
    expect(res.data).toMatchObject({
      url: `/admin/pms/attribute/template/${id}`,
      method: 'delete'
    });
  });

  it('fetchGetAttributesByCategory should have correct config', async () => {
    const catId = 1;
    const res = await fetchGetAttributesByCategory(catId);
    expect(res.data).toMatchObject({
      url: `/admin/pms/attribute/category/${catId}`,
      method: 'get'
    });
  });
});
