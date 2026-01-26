import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { Result } from 'src/common/response';
import { Member } from '../common/decorators/member.decorator';

/**
 * C端地址管理接口
 */
@ApiTags('C端-地址管理')
@ApiBearerAuth()
@UseGuards(AuthGuard('member-jwt'))
@Controller('client/address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('list')
  @ApiOperation({ summary: '获取地址列表' })
  async getAddressList(@Member('memberId') memberId: string) {
    const result = await this.addressService.getAddressList(memberId);
    return Result.ok(result);
  }

  @Get('default')
  @ApiOperation({ summary: '获取默认地址' })
  async getDefaultAddress(@Member('memberId') memberId: string) {
    const result = await this.addressService.getDefaultAddress(memberId);
    return Result.ok(result);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取地址详情' })
  async getAddressDetail(@Member('memberId') memberId: string, @Param('id') id: string) {
    const result = await this.addressService.getAddressDetail(memberId, id);
    return Result.ok(result);
  }

  @Post()
  @ApiOperation({ summary: '创建地址' })
  async createAddress(@Member('memberId') memberId: string, @Body() dto: CreateAddressDto) {
    const result = await this.addressService.createAddress(memberId, dto);
    return Result.ok(result, '创建成功');
  }

  @Put()
  @ApiOperation({ summary: '更新地址' })
  async updateAddress(@Member('memberId') memberId: string, @Body() dto: UpdateAddressDto) {
    const result = await this.addressService.updateAddress(memberId, dto);
    return Result.ok(result, '更新成功');
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除地址' })
  async deleteAddress(@Member('memberId') memberId: string, @Param('id') id: string) {
    await this.addressService.deleteAddress(memberId, id);
    return Result.ok(null, '删除成功');
  }

  @Put(':id/default')
  @ApiOperation({ summary: '设为默认地址' })
  async setDefaultAddress(@Member('memberId') memberId: string, @Param('id') id: string) {
    await this.addressService.setDefaultAddress(memberId, id);
    return Result.ok(null, '设置成功');
  }
}
