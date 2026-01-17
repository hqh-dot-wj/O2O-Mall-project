import { ApiProperty } from '@nestjs/swagger';
import { ClientUserVo } from '../../user/vo';

export class LoginResultVo {
    @ApiProperty({ description: '是否已注册(true:已注册且返回Token, false:未注册)' })
    isRegistered: boolean;

    @ApiProperty({ description: '登录Token', required: false })
    token?: string;

    @ApiProperty({ description: '用户信息', required: false })
    userInfo?: ClientUserVo;
}
