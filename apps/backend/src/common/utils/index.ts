import { Logger } from '@nestjs/common';
import * as Lodash from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear'; // 导入插件
import timezone from 'dayjs/plugin/timezone'; // 导入插件
import utc from 'dayjs/plugin/utc'; // 导入插件
import 'dayjs/locale/zh-cn'; // 导入本地化语言
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isLeapYear); // 使用插件
dayjs.locale('zh-cn'); // 使用本地化语言
dayjs.tz.setDefault('Asia/Beijing');

import { Decimal } from '@prisma/client/runtime/library';
import { DataScopeEnum } from '../enum/index';

/**
 * 数组转树结构
 * @param arr
 * @param getId
 * @param getLabel
 * @returns
 */
export function ListToTree<T extends { parentId?: number | string }>(
  arr: T[],
  getId: (m: T) => number | string,
  getLabel: (m: T) => string,
): Array<{ id: number | string; label: string; parentId: number; children: unknown[] }> {
  const kData: Record<string, { id: number | string; label: string; parentId: number; children: unknown[] }> = {};
  const lData: Array<{ id: number | string; label: string; parentId: number; children: unknown[] }> = [];

  // 第一次遍历，构建 kData
  arr.forEach((m) => {
    const id = getId(m);
    const label = getLabel(m);
    const parentId = +m.parentId;

    kData[id] = {
      id,
      label,
      parentId,
      children: [], // 初始化 children 数组
    };

    // 如果是根节点，直接推入 lData
    if (parentId === 0) {
      lData.push(kData[id]);
    }
  });
  // 第二次遍历，处理子节点
  arr.forEach((m) => {
    const id = getId(m);
    const parentId = +m.parentId;

    if (parentId !== 0) {
      // 确保父节点存在后再添加子节点
      if (kData[parentId]) {
        kData[parentId].children.push(kData[id]);
      } else {
        Logger.warn(`Parent menuId: ${parentId} not found for child menuId: ${id}`, 'Utils');
      }
    }
  });
  return lData;
}

/**
 * 获取当前时间
 * YYYY-MM-DD HH:mm:ss
 * @returns
 */
export function GetNowDate() {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 时间格式化
 * @param date
 * @param format
 * @returns
 */
export function FormatDate(date: Date, format = 'YYYY-MM-DD HH:mm:ss') {
  return date && dayjs(date).format(format);
}

/**
 * 格式化对象中的时间字段
 * @param obj 要格式化的对象或数组
 * @param dateFields 需要格式化的字段名数组，默认为常用时间字段
 * @returns 格式化后的对象
 */
export function FormatDateFields<T>(
  obj: T,
  dateFields: string[] = [
    'createTime',
    'updateTime',
    'loginDate',
    'loginTime',
    'operTime',
    'expireTime',
    'auditTime',
    'payTime',
    'serviceDate',
    'planSettleTime',
    'settleTime',
  ],
): T {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => FormatDateFields(item, dateFields)) as T;
  }

  if (typeof obj === 'object') {
    const formatted = { ...(obj as Record<string, unknown>) } as Record<string, unknown>;

    for (const key in formatted) {
      const value = formatted[key];

      // 1. 处理 BigInt
      if (typeof value === 'bigint') {
        formatted[key] = value.toString();
        continue;
      }

      // 2. 处理 Decimal
      if (value && typeof value === 'object') {
        const val = value as Record<string, unknown>;
        // Case A: Prisma Decimal Instance
        if (value instanceof Decimal || (typeof (val as { toNumber?: unknown }).toNumber === 'function')) {
          formatted[key] = (value as Decimal).toNumber();
          continue;
        }

        // Case B: Serialized Decimal POJO { s, e, d }
        // 这种结构通常是 Decimal 已经被 JSON.parse 过的产物，或者被错误地深拷贝了
        const raw = val as { s?: unknown; e?: unknown; d?: unknown };
        if (raw.s !== undefined && raw.e !== undefined && Array.isArray(raw.d)) {
          try {
            // Decimal 序列化后的 POJO { s, e, d }，通过 unknown 安全断言传入
            formatted[key] = new Decimal(raw as unknown as ConstructorParameters<typeof Decimal>[0]).toNumber();
            continue;
          } catch {
            // ignore
          }
        }
      }

      // 3. 处理 Date 字段
      if (dateFields.includes(key) && value) {
        if (value instanceof Date) {
          formatted[key] = FormatDate(value);
        } else if (typeof value === 'string') {
          const dateValue = new Date(value);
          if (!isNaN(dateValue.getTime())) {
            formatted[key] = FormatDate(dateValue);
          }
        }
        continue;
      }

      // 4. 递归处理嵌套对象 (如果是普通对象且不是 Date/Decimal/Array)
      // 注意: Array已经在最上面处理了
      if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Decimal)) {
        formatted[key] = FormatDateFields(value, dateFields);
      }
    }
    return formatted as T;
  }

  return obj;
}

/**
 * 深拷贝
 * @param obj
 * @returns
 */
export function DeepClone<T>(obj: T) {
  return Lodash.cloneDeep(obj);
}

/**
 * 生成唯一id
 * UUID
 * @returns
 */
export function GenerateUUID(): string {
  const uuid = uuidv4();
  return uuid.replaceAll('-', '');
}

/**
 * 数组去重
 * @param list
 * @returns
 */
export function Uniq<T extends number | string>(list: Array<T>): Array<T> {
  return Lodash.uniq(list);
}

/**
 * 分页
 * @param data
 * @param pageSize
 * @param pageNum
 * @returns
 */
/** Paginate 过滤项需包含的可选字段 */
interface PaginateFilterable {
  ipaddr?: string;
  userName?: string;
}

export function Paginate<T extends PaginateFilterable>(
  data: { list: T[]; pageSize: number; pageNum: number },
  filterParam: Record<string, unknown>,
) {
  // 检查 pageSize 和 pageNumber 的合法性
  if (data.pageSize <= 0 || data.pageNum < 0) {
    return [] as T[];
  }

  // 将数据转换为数组
  let arrayData = Lodash.toArray(data.list);

  if (Object.keys(filterParam).length > 0) {
    const ipaddr = filterParam.ipaddr as string | undefined;
    const userName = filterParam.userName as string | undefined;
    arrayData = Lodash.filter(arrayData, (item) => {
      const arr: boolean[] = [];
      if (ipaddr && item.ipaddr) {
        arr.push(item.ipaddr.includes(ipaddr));
      }
      if (userName && item.userName) {
        arr.push(item.userName.includes(userName));
      }
      return arr.length === 0 || !arr.includes(false);
    });
  }

  // 获取指定页的数据
  const pageData = arrayData.slice((data.pageNum - 1) * data.pageSize, data.pageNum * data.pageSize);

  return pageData;
}

/**
 * 数据范围过滤
 *
 * @param joinPoint 切点
 * @param user 用户
 * @param deptAlias 部门别名
 * @param userAlias 用户别名
 * @param permission 权限字符
 */
export async function DataScopeFilter<T extends Record<string, unknown>>(
  entity: T,
  dataScope: DataScopeEnum,
): Promise<T> {
  switch (dataScope) {
    case DataScopeEnum.DATA_SCOPE_CUSTOM:
      // entity.andWhere((qb) => {
      //   const subQuery = qb.subQuery().select('user.deptId').from(User, 'user').where('user.userId = :userId').getQuery();
      //   return 'post.title IN ' + subQuery;
      // });
      break;
    default:
      break;
  }
  return entity;
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: unknown): item is Record<string, unknown> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(
  target: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  if (!sources.length) return target;
  const source = sources.shift();
  if (!source) return target;

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

/**
 * 判断值是否为null undefined 空字符串 NaN
 */
export function isEmpty(value: unknown) {
  return value === null || value === undefined || value === '' || value === 'NaN';
}
