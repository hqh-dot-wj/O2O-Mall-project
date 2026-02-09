import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlayStrategyFactory } from './play.factory';
import { PlayMetadata } from './play.registry';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { ResponseCode } from 'src/common/response/response.interface';
import { Api } from 'src/common/decorators/api.decorator';
import { CourseGroupBuyService } from './course-group-buy.service';

/**
 * 玩法查询控制器
 *
 * @description
 * 提供营销玩法的元数据查询接口,供前端动态生成表单和展示玩法列表。
 *
 * 核心功能:
 * 1. 获取所有可用玩法列表
 * 2. 获取指定玩法的详细元数据
 */
@ApiTags('营销-玩法管理')
@Controller('api/marketing/play')
export class PlayController {
  constructor(
    private readonly playFactory: PlayStrategyFactory,
    private readonly courseGroupBuyService: CourseGroupBuyService,
  ) {}

  /**
   * 获取所有可用玩法列表
   *
   * @description
   * 返回系统中所有已注册的营销玩法元数据。
   * 前端可以基于此接口动态生成玩法选择器。
   *
   * @returns 所有玩法的元数据数组
   *
   * @example
   * GET /api/marketing/play/types
   *
   * Response:
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": [
   *     {
   *       "code": "GROUP_BUY",
   *       "name": "普通拼团",
   *       "hasInstance": true,
   *       "hasState": true,
   *       "canFail": true,
   *       "canParallel": true,
   *       "defaultStockMode": "STRONG_LOCK",
   *       "description": "用户发起或参与拼团，人数达到要求后成功，超时未满员则失败退款"
   *     },
   *     // ... 其他玩法
   *   ]
   * }
   */
  @Get('types')
  @Api({ summary: '获取所有可用玩法列表' })
  async getAllPlayTypes(): Promise<PlayMetadata[]> {
    return this.playFactory.getAllPlayTypes();
  }

  /**
   * 获取指定玩法的元数据
   *
   * @description
   * 根据玩法代码获取该玩法的详细元数据。
   * 前端可以基于此接口动态生成规则配置表单。
   *
   * @param code 玩法代码
   * @returns 玩法元数据
   * @throws {BusinessException} 如果玩法不存在
   *
   * @example
   * GET /api/marketing/play/types/GROUP_BUY
   *
   * Response:
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "code": "GROUP_BUY",
   *     "name": "普通拼团",
   *     "hasInstance": true,
   *     "hasState": true,
   *     "canFail": true,
   *     "canParallel": true,
   *     "defaultStockMode": "STRONG_LOCK",
   *     "description": "用户发起或参与拼团，人数达到要求后成功，超时未满员则失败退款",
   *     "ruleSchema": { ... }
   *   }
   * }
   */
  @Get('types/:code')
  @Api({ summary: '获取指定玩法的元数据' })
  async getPlayType(@Param('code') code: string): Promise<PlayMetadata> {
    try {
      return this.playFactory.getMetadata(code);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `获取玩法元数据失败: ${error.message}`);
    }
  }

  /**
   * 检查玩法是否存在
   *
   * @description
   * 检查指定的玩法代码是否已注册。
   *
   * @param code 玩法代码
   * @returns 是否存在
   *
   * @example
   * GET /api/marketing/play/types/GROUP_BUY/exists
   *
   * Response:
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "exists": true,
   *     "code": "GROUP_BUY"
   *   }
   * }
   */
  @Get('types/:code/exists')
  @Api({ summary: '检查玩法是否存在' })
  async checkPlayExists(@Param('code') code: string): Promise<{ exists: boolean; code: string }> {
    const exists = this.playFactory.hasStrategy(code);
    return { exists, code };
  }

  /**
   * 获取玩法特性信息
   *
   * @description
   * 获取指定玩法的特性信息（是否有实例、是否可失败等）。
   * 用于前端根据玩法特性动态调整 UI 和业务逻辑。
   *
   * @param code 玩法代码
   * @returns 玩法特性信息
   *
   * @example
   * GET /api/marketing/play/types/GROUP_BUY/features
   *
   * Response:
   * {
   *   "code": 200,
   *   "message": "success",
   *   "data": {
   *     "code": "GROUP_BUY",
   *     "hasInstance": true,
   *     "hasState": true,
   *     "canFail": true,
   *     "canParallel": true
   *   }
   * }
   */
  @Get('types/:code/features')
  @Api({ summary: '获取玩法特性信息' })
  async getPlayFeatures(@Param('code') code: string): Promise<{
    code: string;
    hasInstance: boolean;
    hasState: boolean;
    canFail: boolean;
    canParallel: boolean;
  }> {
    try {
      return {
        code,
        hasInstance: this.playFactory.hasInstance(code),
        hasState: this.playFactory.hasState(code),
        canFail: this.playFactory.canFail(code),
        canParallel: this.playFactory.canParallel(code),
      };
    } catch (error) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `获取玩法特性失败: ${error.message}`);
    }
  }

  // ==================== 课程拼团扩展接口 ====================

  /**
   * 获取课程排课信息
   *
   * @description
   * 获取指定课程实例的排课计划。
   *
   * @param instanceId 实例ID
   * @returns 排课列表
   *
   * @example
   * GET /api/marketing/play/course/:instanceId/schedules
   */
  @Get('course/:instanceId/schedules')
  @Api({ summary: '获取课程排课信息' })
  async getCourseSchedules(@Param('instanceId') instanceId: string) {
    try {
      return await this.courseGroupBuyService.getSchedules(instanceId);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `获取排课信息失败: ${error.message}`);
    }
  }

  /**
   * 获取课程考勤信息
   *
   * @description
   * 获取指定课程实例的考勤记录。
   *
   * @param instanceId 实例ID
   * @returns 考勤列表
   *
   * @example
   * GET /api/marketing/play/course/:instanceId/attendances
   */
  @Get('course/:instanceId/attendances')
  @Api({ summary: '获取课程考勤信息' })
  async getCourseAttendances(@Param('instanceId') instanceId: string) {
    try {
      return await this.courseGroupBuyService.getAttendances(instanceId);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `获取考勤信息失败: ${error.message}`);
    }
  }

  /**
   * 标记学员出勤
   *
   * @description
   * 标记指定学员在指定日期的出勤情况。
   *
   * @param instanceId 实例ID
   * @param body 出勤信息
   * @returns 考勤记录
   *
   * @example
   * POST /api/marketing/play/course/:instanceId/attendance
   * Body: { "memberId": "xxx", "date": "2024-01-01", "remark": "准时到达" }
   */
  @Post('course/:instanceId/attendance')
  @Api({ summary: '标记学员出勤' })
  async markAttendance(
    @Param('instanceId') instanceId: string,
    @Body() body: { memberId: string; date: string; remark?: string },
  ) {
    try {
      const date = new Date(body.date);
      return await this.courseGroupBuyService.markAttendance(
        instanceId,
        body.memberId,
        date,
        body.remark,
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `标记出勤失败: ${error.message}`);
    }
  }

  /**
   * 获取学员出勤率
   *
   * @description
   * 获取指定学员的出勤率统计。
   *
   * @param instanceId 实例ID
   * @param memberId 学员ID
   * @returns 出勤率统计
   *
   * @example
   * GET /api/marketing/play/course/:instanceId/attendance-rate?memberId=xxx
   */
  @Get('course/:instanceId/attendance-rate')
  @Api({ summary: '获取学员出勤率' })
  async getAttendanceRate(
    @Param('instanceId') instanceId: string,
    @Query('memberId') memberId: string,
  ) {
    try {
      if (!memberId) {
        throw new BusinessException(ResponseCode.PARAM_INVALID, '学员ID不能为空');
      }
      return await this.courseGroupBuyService.getAttendanceRate(instanceId, memberId);
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, `获取出勤率失败: ${error.message}`);
    }
  }
}
