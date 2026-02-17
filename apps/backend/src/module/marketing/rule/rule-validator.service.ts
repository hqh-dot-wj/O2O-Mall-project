import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { PlayStrategyFactory } from '../play/play.factory';
import { getErrorMessage, getErrorStack } from 'src/common/utils/error';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { getMetadataStorage } from 'class-validator';
import { ValidationMetadata } from 'class-validator/types/metadata/ValidationMetadata';

/**
 * 规则校验结果接口
 *
 * @description
 * 统一的规则校验结果格式，包含校验状态和错误信息
 */
export interface ValidationResult {
  /**
   * 校验是否通过
   */
  valid: boolean;

  /**
   * 错误信息列表
   * - 每个错误包含字段名和错误描述
   */
  errors: Array<{
    field: string;
    message: string;
    constraints?: Record<string, string>;
  }>;
}

/**
 * 表单字段 Schema 接口
 *
 * @description
 * 用于前端动态表单生成的字段定义
 */
export interface FormFieldSchema {
  /**
   * 字段名称
   */
  name: string;

  /**
   * 字段类型
   * - string: 字符串
   * - number: 数字
   * - boolean: 布尔值
   * - array: 数组
   * - object: 对象
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /**
   * 字段标签（用于前端展示）
   */
  label?: string;

  /**
   * 字段描述
   */
  description?: string;

  /**
   * 是否必填
   */
  required: boolean;

  /**
   * 默认值
   */
  defaultValue?: any;

  /**
   * 校验规则
   */
  validations?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: string[];
  };

  /**
   * 子字段（用于 array 和 object 类型）
   */
  children?: FormFieldSchema[];
}

/**
 * 表单 Schema 接口
 *
 * @description
 * 完整的表单定义，包含所有字段和元数据
 */
export interface FormSchema {
  /**
   * 玩法代码
   */
  templateCode: string;

  /**
   * 玩法名称
   */
  templateName: string;

  /**
   * 表单字段列表
   */
  fields: FormFieldSchema[];
}

/**
 * 规则校验服务
 *
 * @description
 * 提供统一的规则校验入口，用于：
 * 1. DTO 自动校验（基于 class-validator）
 * 2. 业务逻辑校验（调用 Strategy.validateConfig）
 * 3. 生成前端表单 Schema（基于 ruleSchema）
 *
 * 核心功能：
 * - 运营配置时提前发现错误
 * - 提供清晰的错误提示
 * - 支持前端动态表单生成
 *
 * @example
 * ```typescript
 * // 校验规则
 * const result = await ruleValidator.validate('GROUP_BUY', {
 *   price: 99,
 *   minCount: 2,
 *   maxCount: 10,
 * });
 *
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 *
 * // 获取表单 Schema
 * const schema = await ruleValidator.getRuleFormSchema('GROUP_BUY');
 * ```
 */
@Injectable()
export class RuleValidatorService {
  private readonly logger = new Logger(RuleValidatorService.name);

  constructor(private readonly playFactory: PlayStrategyFactory) {}

  /**
   * 统一规则校验入口
   *
   * @description
   * 执行两层校验：
   * 1. DTO 校验：基于 class-validator 装饰器自动校验
   * 2. 业务逻辑校验：调用策略的 validateConfig 方法
   *
   * @param templateCode 玩法代码（如 'GROUP_BUY'）
   * @param rules 规则配置对象
   * @returns 校验结果
   *
   * @example
   * ```typescript
   * const result = await ruleValidator.validate('COURSE_GROUP_BUY', {
   *   minUsers: 3,
   *   maxUsers: 10,
   *   joinDeadline: '2024-03-01T00:00:00Z',
   *   price: 199,
   * });
   *
   * if (!result.valid) {
   *   result.errors.forEach(error => {
   *     console.log(`${error.field}: ${getErrorMessage(error)}`);
   *   });
   * }
   * ```
   */
  async validate(templateCode: string, rules: any): Promise<ValidationResult> {
    try {
      // 1. 获取玩法元数据
      const metadata = this.playFactory.getMetadata(templateCode);
      if (!metadata) {
        return {
          valid: false,
          errors: [
            {
              field: 'templateCode',
              message: `未找到玩法: ${templateCode}`,
            },
          ],
        };
      }

      // 2. DTO 校验（基于 class-validator）
      const dtoValidationResult = await this.validateDto(metadata.ruleSchema, rules);
      if (!dtoValidationResult.valid) {
        return dtoValidationResult;
      }

      // 3. 业务逻辑校验（调用 Strategy.validateConfig）
      const businessValidationResult = await this.validateBusinessLogic(templateCode, rules);
      if (!businessValidationResult.valid) {
        return businessValidationResult;
      }

      // 4. 校验通过
      this.logger.log(`规则校验通过: ${templateCode}`);
      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      this.logger.error(`规则校验异常: ${getErrorMessage(error)}`, getErrorStack(error));

      // 如果是业务异常，返回友好的错误信息
      if (error instanceof BusinessException) {
        return {
          valid: false,
          errors: [
            {
              field: 'rules',
              message: getErrorMessage(error),
            },
          ],
        };
      }

      // 其他异常，返回通用错误
      return {
        valid: false,
        errors: [
          {
            field: 'unknown',
            message: '规则校验失败，请检查配置',
          },
        ],
      };
    }
  }

  /**
   * DTO 校验
   *
   * @description
   * 使用 class-validator 自动校验 DTO 类的装饰器规则
   *
   * @param dtoClass DTO 类
   * @param rules 规则对象
   * @returns 校验结果
   * @private
   */
  private async validateDto(dtoClass: any, rules: any): Promise<ValidationResult> {
    try {
      // 将普通对象转换为 DTO 实例
      const dtoInstance = plainToInstance(dtoClass, rules);

      // 执行校验
      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true, // 自动移除未定义的属性
        forbidNonWhitelisted: false, // 不禁止额外属性（兼容性考虑）
        skipMissingProperties: false, // 不跳过缺失属性
      });

      // 如果有错误，格式化错误信息
      if (errors.length > 0) {
        return {
          valid: false,
          errors: this.formatValidationErrors(errors),
        };
      }

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      this.logger.error(`DTO 校验异常: ${getErrorMessage(error)}`, getErrorStack(error));
      return {
        valid: false,
        errors: [
          {
            field: 'dto',
            message: 'DTO 校验失败',
          },
        ],
      };
    }
  }

  /**
   * 业务逻辑校验
   *
   * @description
   * 调用策略的 validateConfig 方法执行业务逻辑校验
   * 例如：
   * - 拼班课程：报名截止时间必须早于上课开始时间
   * - 拼团：最大人数必须大于最小人数
   * - 秒杀：库存必须大于0
   *
   * @param templateCode 玩法代码
   * @param rules 规则对象
   * @returns 校验结果
   * @private
   */
  private async validateBusinessLogic(templateCode: string, rules: any): Promise<ValidationResult> {
    try {
      // 获取策略实例
      const strategy = this.playFactory.getStrategy(templateCode);

      // 如果策略没有实现 validateConfig 方法，跳过业务逻辑校验
      if (!strategy.validateConfig) {
        return {
          valid: true,
          errors: [],
        };
      }

      // 执行业务逻辑校验
      await strategy.validateConfig(rules);

      return {
        valid: true,
        errors: [],
      };
    } catch (error) {
      this.logger.warn(`业务逻辑校验失败: ${getErrorMessage(error)}`);

      // 如果是业务异常，返回友好的错误信息
      if (error instanceof BusinessException) {
        return {
          valid: false,
          errors: [
            {
              field: 'businessLogic',
              message: getErrorMessage(error),
            },
          ],
        };
      }

      // 其他异常
      return {
        valid: false,
        errors: [
          {
            field: 'businessLogic',
            message: getErrorMessage(error) || '业务逻辑校验失败',
          },
        ],
      };
    }
  }

  /**
   * 格式化 class-validator 的错误信息
   *
   * @description
   * 将 ValidationError 对象转换为统一的错误格式
   *
   * @param errors class-validator 的错误对象数组
   * @returns 格式化后的错误信息数组
   * @private
   */
  private formatValidationErrors(
    errors: ValidationError[],
  ): Array<{ field: string; message: string; constraints?: Record<string, string> }> {
    const formattedErrors: Array<{ field: string; message: string; constraints?: Record<string, string> }> = [];

    for (const error of errors) {
      // 处理嵌套错误（如数组中的对象）
      if (error.children && error.children.length > 0) {
        const childErrors = this.formatValidationErrors(error.children);
        childErrors.forEach((childError) => {
          formattedErrors.push({
            field: `${error.property}.${childError.field}`,
            message: childError.message,
            constraints: childError.constraints,
          });
        });
      } else {
        // 处理当前字段的错误
        const constraints = error.constraints || {};
        const messages = Object.values(constraints);
        const message = messages.length > 0 ? messages[0] : `${error.property} 校验失败`;

        formattedErrors.push({
          field: error.property,
          message,
          constraints,
        });
      }
    }

    return formattedErrors;
  }

  /**
   * 获取规则表单 Schema
   *
   * @description
   * 基于 DTO 类的 class-validator 装饰器生成前端表单 Schema。
   * 前端可以根据此 Schema 动态生成表单，实现配置界面的自动化。
   *
   * 支持的装饰器：
   * - @IsNotEmpty: 必填字段
   * - @IsOptional: 可选字段
   * - @IsNumber: 数字类型
   * - @IsString: 字符串类型
   * - @IsBoolean: 布尔类型
   * - @IsArray: 数组类型
   * - @Min: 最小值
   * - @Max: 最大值
   * - @MinLength: 最小长度
   * - @MaxLength: 最大长度
   * - @ApiProperty: 字段描述（Swagger）
   *
   * @param templateCode 玩法代码
   * @returns 表单 Schema
   *
   * @example
   * ```typescript
   * const schema = await ruleValidator.getRuleFormSchema('GROUP_BUY');
   * // 返回:
   * // {
   * //   templateCode: 'GROUP_BUY',
   * //   templateName: '普通拼团',
   * //   fields: [
   * //     {
   * //       name: 'price',
   * //       type: 'number',
   * //       label: '默认拼团价格',
   * //       required: false,
   * //       validations: { min: 0 }
   * //     },
   * //     {
   * //       name: 'minCount',
   * //       type: 'number',
   * //       label: '最小成团人数',
   * //       required: false,
   * //       defaultValue: 2,
   * //       validations: { min: 2 }
   * //     },
   * //     ...
   * //   ]
   * // }
   * ```
   */
  async getRuleFormSchema(templateCode: string): Promise<FormSchema> {
    try {
      // 1. 获取玩法元数据
      const metadata = this.playFactory.getMetadata(templateCode);
      if (!metadata) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `未找到玩法: ${templateCode}`);
      }

      // 2. 获取 DTO 类
      const dtoClass = metadata.ruleSchema;
      if (!dtoClass) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, `玩法 ${templateCode} 没有定义 ruleSchema`);
      }

      // 3. 解析 DTO 类生成表单 Schema
      const fields = this.parseClassToFormFields(dtoClass);

      // 4. 返回完整的表单 Schema
      return {
        templateCode: metadata.code,
        templateName: metadata.name,
        fields,
      };
    } catch (error) {
      this.logger.error(`获取表单 Schema 失败: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * 解析 DTO 类生成表单字段
   *
   * @description
   * 通过反射读取 class-validator 的元数据，生成表单字段定义
   *
   * @param dtoClass DTO 类
   * @returns 表单字段数组
   * @private
   */
  private parseClassToFormFields(dtoClass: any): FormFieldSchema[] {
    const fields: FormFieldSchema[] = [];

    try {
      // 获取 class-validator 的元数据存储
      const metadataStorage = getMetadataStorage();

      // 获取该类的所有校验元数据
      const validationMetadatas = metadataStorage.getTargetValidationMetadatas(
        dtoClass,
        '', // targetName
        true, // always
        false, // strictGroups
      );

      // 按属性名分组
      const metadatasByProperty = new Map<string, ValidationMetadata[]>();
      for (const metadata of validationMetadatas) {
        const propertyName = metadata.propertyName;
        if (!metadatasByProperty.has(propertyName)) {
          metadatasByProperty.set(propertyName, []);
        }
        metadatasByProperty.get(propertyName)!.push(metadata);
      }

      // 为每个属性生成表单字段
      for (const [propertyName, metadatas] of metadatasByProperty.entries()) {
        const field = this.createFormField(propertyName, metadatas, dtoClass);
        if (field) {
          fields.push(field);
        }
      }

      return fields;
    } catch (error) {
      this.logger.error(`解析 DTO 类失败: ${getErrorMessage(error)}`, getErrorStack(error));
      return [];
    }
  }

  /**
   * 创建表单字段
   *
   * @description
   * 根据 class-validator 元数据创建单个表单字段定义
   *
   * @param propertyName 属性名
   * @param metadatas 校验元数据数组
   * @param dtoClass DTO 类
   * @returns 表单字段定义
   * @private
   */
  private createFormField(propertyName: string, metadatas: ValidationMetadata[], dtoClass: any): FormFieldSchema | null {
    try {
      // 基础字段信息
      const field: FormFieldSchema = {
        name: propertyName,
        type: 'string', // 默认类型
        required: true, // 默认必填
        validations: {},
      };

      // 尝试从 @ApiProperty 装饰器获取描述信息
      const apiPropertyMetadata = Reflect.getMetadata('swagger/apiModelProperties', dtoClass.prototype);
      if (apiPropertyMetadata && apiPropertyMetadata[propertyName]) {
        const apiProperty = apiPropertyMetadata[propertyName];
        field.label = apiProperty.description || propertyName;
        field.description = apiProperty.description;
        if (apiProperty.default !== undefined) {
          field.defaultValue = apiProperty.default;
        }
      }

      // 解析 class-validator 装饰器
      for (const metadata of metadatas) {
        switch (metadata.type) {
          // 可选字段
          case 'isOptional':
          case 'conditionalValidation':
            field.required = false;
            break;

          // 必填字段
          case 'isNotEmpty':
            field.required = true;
            break;

          // 数字类型
          case 'isNumber':
          case 'isInt':
          case 'isPositive':
          case 'isNegative':
            field.type = 'number';
            break;

          // 字符串类型
          case 'isString':
            field.type = 'string';
            break;

          // 布尔类型
          case 'isBoolean':
            field.type = 'boolean';
            break;

          // 数组类型
          case 'isArray':
            field.type = 'array';
            break;

          // 最小值
          case 'min':
            if (!field.validations) field.validations = {};
            field.validations.min = metadata.constraints?.[0];
            break;

          // 最大值
          case 'max':
            if (!field.validations) field.validations = {};
            field.validations.max = metadata.constraints?.[0];
            break;

          // 最小长度
          case 'minLength':
            if (!field.validations) field.validations = {};
            field.validations.minLength = metadata.constraints?.[0];
            break;

          // 最大长度
          case 'maxLength':
            if (!field.validations) field.validations = {};
            field.validations.maxLength = metadata.constraints?.[0];
            break;

          // 正则表达式
          case 'matches':
            if (!field.validations) field.validations = {};
            field.validations.pattern = metadata.constraints?.[0];
            break;

          // 嵌套对象校验
          case 'nestedValidation':
            field.type = 'object';
            // 可以递归解析嵌套对象，这里暂时简化处理
            break;

          default:
            // 其他装饰器暂不处理
            break;
        }
      }

      return field;
    } catch (error) {
      this.logger.error(`创建表单字段失败: ${propertyName}`, getErrorStack(error));
      return null;
    }
  }
}
