import { ApiProperty } from '@nestjs/swagger';

export class StationVo {
    @ApiProperty({ description: 'ID' })
    id: string;

    @ApiProperty({ description: '站点名称' })
    name: string;

    @ApiProperty({ description: '地址' })
    address: string;

    @ApiProperty({ description: '经度' })
    lng: number;

    @ApiProperty({ description: '纬度' })
    lat: number;

    @ApiProperty({ description: '电子围栏ID' })
    fenceId: string;

    @ApiProperty({ description: '创建时间' })
    createTime: Date;
}
