import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TimeSlotDto {
    @ApiProperty({ description: '日期，格式：YYYY-MM-DD', example: '2023-10-27' })
    @IsNotEmpty()
    @IsString()
    date: string;
}

export class LockSlotDto {
    @ApiProperty({ description: '日期，格式：YYYY-MM-DD', example: '2023-10-27' })
    @IsNotEmpty()
    @IsString()
    date: string;

    @ApiProperty({ description: '时间，格式：HH:mm', example: '14:30' })
    @IsNotEmpty()
    @IsString()
    time: string;
}
