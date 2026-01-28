import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PageQueryDto } from 'src/common/dto/base.dto';

export class StationPointDto {
  @ApiProperty({ description: '经度' })
  @IsNumber()
  lng: number;

  @ApiProperty({ description: '纬度' })
  @IsNumber()
  lat: number;
}

export class GeoFenceDto {
  @ApiProperty({ description: '围栏类型 (POLYGON/CIRCLE)', default: 'POLYGON' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '围栏点坐标集合', type: [StationPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StationPointDto)
  points: StationPointDto[];

  @ApiProperty({ description: '围栏半径(米) - 圆形围栏必填' })
  @IsOptional()
  @IsNumber()
  radius?: number;
}

export class CreateStationDto {
  @ApiProperty({ description: '站点名称' })
  @IsNotEmpty({ message: '站点名称不能为空' })
  @IsString()
  name: string;

  @ApiProperty({ description: '站点地址' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '中心坐标' })
  @ValidateNested()
  @Type(() => StationPointDto)
  location: StationPointDto;

  @ApiProperty({ description: '电子围栏配置', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoFenceDto)
  fence?: GeoFenceDto;

  @ApiProperty({ description: '负责人', required: false })
  @IsOptional()
  @IsString()
  manager?: string;

  @ApiProperty({ description: '联系电话', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {}

export class ListStationDto extends PageQueryDto {
  @ApiProperty({ description: '站点名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
