import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from 'src/common/decorators/user.decorator';
import { Result } from 'src/common/response';

@ApiTags('C端-用户模块')
@ApiBearerAuth()
@UseGuards(AuthGuard('member-jwt'))
@Controller('client/user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({ summary: '获取用户信息' })
  @Get('info')
  async info(@User('memberId') memberId: string) {
    const user = await this.userService.info(memberId);
    return Result.ok(user);
  }
}
