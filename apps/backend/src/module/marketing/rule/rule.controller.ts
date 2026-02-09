import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RuleValidatorService, ValidationResult } from './rule-validator.service';
import { Api } from 'src/common/decorators/api.decorator';

/**
 * 规则校验请求 DTO
 *
 * @description
 * 用于校验营销活动规则配置的请求参数
 */
export class ValidateRuleDto {
  /**
   * 玩法代码
   * @example 'GROUP_BUY'
   */
  templateCode: string;

  /**
   * 规则配置对象
   * @example { "minCount": 2, "maxCount": 10, "price": 99 }
   */
  rules: any;
}

/**
 * 规则校验控制器
 *
 * @description
 * 提供营销规则的校验接口，供运营后台在保存配置前进行实时校验。
 *
 * 核心功能：
 * 1. 单个规则校验 - 校验单个活动的规则配置
 * 2. 表单 Schema 获取 - 为前端动态表单提供 Schema
 *
 * 使用场景：
 * - 运营后台创建/编辑活动时的实时校验
 * - 前端动态表单生成
 * - 保存前的最终校验
 *
 * @example
 * // 校验规则
 * POST /api/marketing/rule/validate
 * {
 *   "templateCode": "GROUP_BUY",
 *   "rules": { "minCount": 2, "maxCount": 10, "price": 99 }
 * }
 *
 * // 获取表单 Schema
 * GET /api/marketing/rule/schema/GROUP_BUY
 *
 * @see RuleValidatorService
 * @see FR-2.4 生成前端表单 Schema
 * @see US-1 运营人员配置活动时能提前知道规则是否合法
 */
@ApiTags('营销-规则校验')
@Controller('api/marketing/rule')
export class RuleController {
  constructor(private readonly validatorService: RuleValidatorService) {}

  /**
   * 校验规则配置
   *
   * @description
   * 对单个活动的规则配置进行完整校验，包括：
   * 1. 字段类型校验（基于 class-validator）
   * 2. 字段约束校验（最小值、最大值、长度等）
   * 3. 业务逻辑校验（基于玩法策略）
   *
   * 使用场景：
   * - 运营后台创建/编辑活动时的实时校验
   * - 保存前的最终校验
   * - 批量导入前的预校验
   *
   * @param dto 校验请求，包含玩法代码和规则配置
   * @returns 校验结果，包含是否通过和错误信息列表
   *
   * @example
   * // 请求示例
   * POST /api/marketing/rule/validate
   * {
   *   "templateCode": "GROUP_BUY",
   *   "rules": {
   *     "minCount": 2,
   *     "maxCount": 10,
   *     "price": 99
   *   }
   * }
   *
   * // 成功响应
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "valid": true,
   *     "errors": []
   *   }
   * }
   *
   * // 校验失败响应
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "valid": false,
   *     "errors": [
   *       {
   *         "field": "maxCount",
   *         "message": "最大人数不能小于最小人数"
   *       },
   *       {
   *         "field": "price",
   *         "message": "价格必须大于0"
   *       }
   *     ]
   *   }
   * }
   *
   * @see RuleValidatorService.validate
   * @see FR-2.4 统一规则校验服务
   * @see US-1 运营人员配置活动时能提前知道规则是否合法
   */
  @Post('validate')
  @Api({
    summary: '校验规则配置',
    description: '对营销活动的规则配置进行完整校验，包括字段类型、约束和业务逻辑校验',
  })
  async validateRule(@Body() dto: ValidateRuleDto): Promise<ValidationResult> {
    return await this.validatorService.validate(dto.templateCode, dto.rules);
  }

  /**
   * 获取规则表单 Schema
   *
   * @description
   * 根据玩法代码获取该玩法的规则表单 Schema。
   * 前端可以基于此 Schema 动态生成表单组件，实现配置界面的自动化。
   *
   * Schema 包含：
   * - 字段名称、类型、标签
   * - 是否必填
   * - 默认值
   * - 校验规则（最小值、最大值、长度、正则等）
   *
   * 使用场景：
   * - 前端动态表单生成
   * - 表单验证规则配置
   * - API 文档生成
   *
   * @param templateCode 玩法代码（如 'GROUP_BUY', 'FLASH_SALE'）
   * @returns 表单 Schema 对象
   *
   * @example
   * // 请求示例
   * GET /api/marketing/rule/schema/GROUP_BUY
   *
   * // 响应示例
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "templateCode": "GROUP_BUY",
   *     "templateName": "普通拼团",
   *     "fields": [
   *       {
   *         "name": "price",
   *         "type": "number",
   *         "label": "默认拼团价格",
   *         "description": "用户参与拼团需要支付的价格",
   *         "required": false,
   *         "validations": {
   *           "min": 0
   *         }
   *       },
   *       {
   *         "name": "minCount",
   *         "type": "number",
   *         "label": "最小成团人数",
   *         "description": "拼团最少需要的人数",
   *         "required": false,
   *         "defaultValue": 2,
   *         "validations": {
   *           "min": 2
   *         }
   *       },
   *       {
   *         "name": "maxCount",
   *         "type": "number",
   *         "label": "最大成团人数",
   *         "description": "拼团最多允许的人数",
   *         "required": false,
   *         "validations": {
   *           "min": 2
   *         }
   *       }
   *     ]
   *   }
   * }
   *
   * @throws BusinessException 当玩法代码不存在时
   * @see RuleValidatorService.getRuleFormSchema
   * @see FR-2.4 生成前端表单 Schema
   * @see US-1 前端表单基于 RuleSchema 动态生成
   */
  @Get('schema/:templateCode')
  @Api({
    summary: '获取规则表单 Schema',
    description: '根据玩法代码获取该玩法的规则表单 Schema，用于前端动态表单生成',
  })
  async getRuleFormSchema(@Param('templateCode') templateCode: string): Promise<any> {
    return this.validatorService.getRuleFormSchema(templateCode);
  }
}
