/**
 * 课程拼团扩展 API
 *
 * @description
 * 提供课程拼团的排课管理和考勤管理接口
 */

import { request } from '../request';

/** 课程排课记录 */
export interface CourseSchedule {
  id: string;
  extensionId: string;
  tenantId: string;
  date: string;
  startTime: string;
  endTime: string;
  lessons: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  remark?: string;
  createTime: string;
  updateTime: string;
}

/** 课程考勤记录 */
export interface CourseAttendance {
  id: string;
  extensionId: string;
  tenantId: string;
  memberId: string;
  date: string;
  attended: boolean;
  remark?: string;
  createTime: string;
  updateTime: string;
}

/** 出勤率统计 */
export interface AttendanceRate {
  total: number;
  attended: number;
  rate: number;
}

/** 标记出勤请求 */
export interface MarkAttendanceRequest {
  memberId: string;
  date: string;
  remark?: string;
}

/**
 * 获取课程排课信息
 * @param instanceId 实例ID
 */
export function fetchCourseSchedules(instanceId: string) {
  return request<CourseSchedule[]>({
    url: `/api/marketing/play/course/${instanceId}/schedules`,
    method: 'get'
  });
}

/**
 * 获取课程考勤信息
 * @param instanceId 实例ID
 */
export function fetchCourseAttendances(instanceId: string) {
  return request<CourseAttendance[]>({
    url: `/api/marketing/play/course/${instanceId}/attendances`,
    method: 'get'
  });
}

/**
 * 标记学员出勤
 * @param instanceId 实例ID
 * @param data 出勤信息
 */
export function markAttendance(instanceId: string, data: MarkAttendanceRequest) {
  return request<CourseAttendance>({
    url: `/api/marketing/play/course/${instanceId}/attendance`,
    method: 'post',
    data
  });
}

/**
 * 获取学员出勤率
 * @param instanceId 实例ID
 * @param memberId 学员ID
 */
export function fetchAttendanceRate(instanceId: string, memberId: string) {
  return request<AttendanceRate>({
    url: `/api/marketing/play/course/${instanceId}/attendance-rate`,
    method: 'get',
    params: { memberId }
  });
}
