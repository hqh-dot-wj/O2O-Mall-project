import { request } from '@/service/request';

/**
 * Message API
 */

/** get message list */
export function fetchGetMessageList(params?: Api.System.MessageSearchParams) {
  return request<Api.System.MessageListVo>({
    url: '/system/message/list',
    method: 'get',
    params
  });
}

/** send message (test) */
export function fetchCreateMessage(data: Api.System.MessageCreateDto) {
  return request<Api.System.MessageVo>({
    url: '/system/message',
    method: 'post',
    data
  });
}

/** mark as read */
export function fetchReadMessage(id: number) {
  return request<void>({
    url: `/system/message/${id}/read`,
    method: 'put'
  });
}

/** delete message */
export function fetchDeleteMessage(id: number) {
  return request<void>({
    url: `/system/message/${id}`,
    method: 'delete'
  });
}
