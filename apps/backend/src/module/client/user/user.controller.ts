import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from 'src/common/decorators/user.decorator';
import { Result } from 'src/common/response';
import { Api } from 'src/common/decorators/api.decorator';
import { ClientUserVo } from './vo';

@ApiTags('C端-用户模块')
@ApiBearerAuth()
@UseGuards(AuthGuard('member-jwt'))
@Controller('client/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Api({ summary: '获取用户信息', type: ClientUserVo })
  @Get('info')
  async info(@User('memberId') memberId: string) {
    const user = await this.userService.info(memberId);
    return Result.ok(user);
  }
}
