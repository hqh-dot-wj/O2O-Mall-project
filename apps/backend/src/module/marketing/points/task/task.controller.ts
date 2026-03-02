import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PointsTaskService } from './task.service';
import { CreatePointsTaskDto } from './dto/create-points-task.dto';
import { UpdatePointsTaskDto } from './dto/update-points-task.dto';
import { PointsTaskQueryDto } from './dto/points-task-query.dto';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';

/**
 * 积分任务控制器（管理端）
 * 
 * @description 提供积分任务的管理接口
 */
@ApiTags('积分任务管理')
@Controller('admin/marketing/points/tasks')
@ApiBearerAuth('Authorization')
export class PointsTaskAdminController {
  constructor(private readonly taskService: PointsTaskService) {}

  @Post()
  @Api({ summary: '创建积分任务' })
  @RequirePermission('marketing:points:task:add')
  @Operlog({ businessType: BusinessType.INSERT })
  async createTask(@Body() dto: CreatePointsTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Put(':id')
  @Api({ summary: '更新积分任务' })
  @RequirePermission('marketing:points:task:edit')
  @Operlog({ businessType: BusinessType.UPDATE })
  async updateTask(@Param('id') id: string, @Body() dto: UpdatePointsTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Get()
  @Api({ summary: '查询积分任务列表' })
  @RequirePermission('marketing:points:task:list')
  async findAll(@Query() query: PointsTaskQueryDto) {
    return this.taskService.findAll(query);
  }

  @Delete(':id')
  @Api({ summary: '删除积分任务' })
  @RequirePermission('marketing:points:task:delete')
  @Operlog({ businessType: BusinessType.DELETE })
  async deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}

