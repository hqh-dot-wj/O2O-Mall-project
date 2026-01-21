import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PrepayDto {
    @ApiProperty({ description: '订单ID' })
    @IsString()
    @IsNotEmpty()
    orderId: string;

    @ApiProperty({ description: '支付方式', default: 'WECHAT' })
    @IsString()
    @IsNotEmpty()
    paymentMethod: string;
}

export class MockSuccessDto {
    @ApiProperty({ description: '订单ID' })
    @IsString()
    @IsNotEmpty()
    orderId: string;
}
