import * as Lodash from 'lodash';

export const entityTem = (options: any) => {
  const { BusinessName, tableComment } = options;
  const contentTem = content(options);
  return `
/**
 * ${tableComment || ''}
 */
export class ${Lodash.upperFirst(BusinessName)}Entity {
${contentTem}
}
`;
};

const content = (options: any) => {
  const { columns } = options;
  const sortedColumns = [...columns].sort((a: any, b: any) => b.isPk - a.isPk);
  return sortedColumns
    .map((column: any) => {
      const { javaType, javaField, columnComment, isRequired } = column;
      const type = mapJavaTypeToTs(javaType);
      const optionalFlag = isRequired == '1' ? '' : '?';
      const commentLine = columnComment ? `  /** ${columnComment} */\n` : '';
      return `${commentLine}  ${javaField}${optionalFlag}: ${type};`;
    })
    .join('\n');
};

const mapJavaTypeToTs = (javaType = 'String') => {
  switch (javaType) {
    case 'Number':
      return 'number';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'string';
    case 'String':
    default:
      return 'string';
  }
};
