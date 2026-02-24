/**
 * 通用树结构转换工具
 */

export interface TreeConfig<T = Record<string, unknown>> {
  /** ID 字段名 */
  idField: string;
  /** 父 ID 字段名 */
  parentIdField?: string;
  /** children 字段名 */
  childrenField?: string;
  /** 根节点判定值（默认 0） */
  rootValue?: string | number;
  /** 过滤函数 */
  filterFn?: (item: T) => boolean;
}

/**
 * 扁平数组转树结构
 *
 * @example
 * ```ts
 * const tree = listToTree(depts, { idField: 'deptId' });
 * const filtered = listToTree(menus, {
 *   idField: 'menuId',
 *   filterFn: (m) => m.status === '0',
 * });
 * ```
 */
export function listToTree<T extends Record<string, any>>(
  data: T[],
  config: TreeConfig<T>,
): T[] {
  if (!data?.length) return [];

  const {
    idField,
    parentIdField = 'parentId',
    childrenField = 'children',
    rootValue = 0,
    filterFn,
  } = config;

  const childrenMap = new Map<string | number, T[]>();
  const tree: T[] = [];

  for (const item of data) {
    if (filterFn && !filterFn(item)) continue;

    const parentId = item[parentIdField];
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push({ ...item, [childrenField]: [] } as T);
  }

  // 根节点
  const roots = childrenMap.get(rootValue) ?? [];
  const stack = [...roots];

  while (stack.length) {
    const node = stack.pop()!;
    const id = node[idField];
    const children = childrenMap.get(id);
    if (children?.length) {
      (node as any)[childrenField] = children;
      stack.push(...children);
    }
  }

  tree.push(...roots);
  return tree;
}

/** 判断值是否为 null / undefined / 空字符串 */
export function isEmpty(value: unknown): value is null | undefined | '' {
  return value === null || value === undefined || value === '';
}

/** 判断值是否不为 null / undefined / 空字符串 */
export function isNotEmpty(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}
