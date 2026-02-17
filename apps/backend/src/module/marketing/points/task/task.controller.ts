import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PointsTaskService } from './task.service';
import { CreatePointsTaskDto } from './dto/create-points-task.dto';
import { UpdatePointsTaskDto } from './dto/update-points-task.dto';
import { PointsTaskQueryDto } from './dto/points-task-query.dto';

/**
 * 积分任务控制器（管理端）
 * 
 * @description 提供积分任务的管理接口
 */
@ApiTags('积分任务管理')
@Controller('admin/marketing/points/tasks')
export class PointsTaskAdminController {
  constructor(private readonly taskService: PointsTaskService) {}

  @Post()
  @ApiOperation({ summary: '创建积分任务' })
  async createTask(@Body() dto: CreatePointsTaskDto) {
    return this.taskService.createTask(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新积分任务' })
  async updateTask(@Param('id') id: string, @Body() dto: UpdatePointsTaskDto) {
    return this.taskService.updateTask(id, dto);
  }

  @Get()
  @ApiOperation({ summary: '查询积分任务列表' })
  async findAll(@Query() query: PointsTaskQueryDto) {
    return this.taskService.findAll(query);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除积分任务' })
  async deleteTask(@Param('id') id: string) {
    return this.taskService.deleteTask(id);
  }
}

