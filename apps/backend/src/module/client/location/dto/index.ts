import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class MatchTenantDto {
    @ApiProperty({ description: '纬度' })
    @IsNotEmpty({ message: '纬度不能为空' })
    @IsNumber()
    lat: number;

    @ApiProperty({ description: '经度' })
    @IsNotEmpty({ message: '经度不能为空' })
    @IsNumber()
    lng: number;
}

export class NearbyTenantsQueryDto {
    @ApiProperty({ description: '纬度' })
    @IsNotEmpty({ message: '纬度不能为空' })
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    lat: number;

    @ApiProperty({ description: '经度' })
    @IsNotEmpty({ message: '经度不能为空' })
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    lng: number;
}
