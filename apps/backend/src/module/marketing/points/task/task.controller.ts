import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
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

/**
 * 积分任务控制器（客户端）
 * 
 * @description 提供用户任务完成接口
 */
@ApiTags('积分任务')
@Controller('client/marketing/points/tasks')
export class PointsTaskClientController {
  constructor(private readonly taskService: PointsTaskService) {}

  @Get()
  @ApiOperation({ summary: '查询可用任务列表' })
  async findAvailableTasks() {
    return this.taskService.findAll({ isEnabled: true });
  }

  @Post(':taskKey/complete')
  @ApiOperation({ summary: '完成任务' })
  async completeTask(
    @User('id') memberId: string,
    @Param('taskKey') taskKey: string,
  ) {
    return this.taskService.completeTask(memberId, taskKey);
  }

  @Get('my-completions')
  @ApiOperation({ summary: '查询我的任务完成记录' })
  async getMyCompletions(
    @User('id') memberId: string,
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.taskService.getUserCompletions(memberId, pageNum, pageSize);
  }
}
