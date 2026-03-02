import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { Member } from 'src/module/client/common/decorators/member.decorator';
import { MemberAuthGuard } from 'src/module/client/common/guards/member-auth.guard';
import { PointsTaskService } from 'src/module/marketing/points/task/task.service';

/**
 * C端积分任务控制器
 */
@ApiTags('C端-积分任务')
@Controller('client/marketing/points/tasks')
@UseGuards(MemberAuthGuard)
export class ClientPointsTaskController {
  constructor(private readonly taskService: PointsTaskService) {}

  @Get()
  @Api({ summary: '查询可用任务列表' })
  async findAvailableTasks() {
    return this.taskService.findAll({ isEnabled: true });
  }

  @Post(':taskKey/complete')
  @Api({ summary: '完成任务' })
  async completeTask(
    @Member('memberId') memberId: string,
    @Param('taskKey') taskKey: string,
  ) {
    return this.taskService.completeTask(memberId, taskKey);
  }

  @Get('my-completions')
  @Api({ summary: '查询我的任务完成记录' })
  async getMyCompletions(
    @Member('memberId') memberId: string,
    @Query('pageNum') pageNum?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.taskService.getUserCompletions(memberId, pageNum, pageSize);
  }
}
