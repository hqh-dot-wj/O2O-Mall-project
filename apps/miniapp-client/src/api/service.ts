import { httpGet, httpPost } from '@/http/http'

export interface DateVo {
  value: string
  label: string
  week: string
}

export interface TimeSlotVo {
  time: string
  endTime: string
  available: boolean
  reason?: string
}

export interface AvailableDatesResult {
  dates: DateVo[]
}

export interface TimeSlotsResult {
  slots: TimeSlotVo[]
}

/**
 * 获取可预约日期
 */
export function getAvailableDates() {
  return httpGet<AvailableDatesResult>('/client/service/available-dates')
}

/**
 * 获取可用时间段
 */
export function getTimeSlots(date: string) {
  return httpGet<TimeSlotsResult>('/client/service/time-slots', { date })
}

/**
 * 锁定时间段
 */
export function lockSlot(date: string, time: string) {
  return httpPost('/client/service/lock-slot', { date, time })
}
