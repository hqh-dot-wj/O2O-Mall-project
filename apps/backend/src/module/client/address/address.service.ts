import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { AddressVo, AddressListVo } from './vo/address.vo';
import { AddressRepository } from './address.repository';

/**
 * C端地址服务
 * 提供收货地址的 CRUD 功能
 */
@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  // 每个用户最多保存的地址数量
  private readonly MAX_ADDRESS_COUNT = 20;

  constructor(private readonly addressRepo: AddressRepository) {}

  /**
   * 获取地址列表
   */
  async getAddressList(memberId: string): Promise<AddressListVo> {
    const addresses = await this.addressRepo.findMany({
      where: { memberId },
      orderBy: [
        { isDefault: 'desc' }, // 默认地址排前面
        { createTime: 'desc' },
      ],
    });

    const list: AddressVo[] = addresses.map((addr) => this.toVo(addr));

    return { list };
  }

  /**
   * 获取地址详情
   */
  async getAddressDetail(memberId: string, addressId: string): Promise<AddressVo> {
    const address = await this.addressRepo.findOne({
      id: addressId,
      memberId,
    });

    BusinessException.throwIfNull(address, '地址不存在');

    return this.toVo(address);
  }

  /**
   * 获取默认地址
   */
  async getDefaultAddress(memberId: string): Promise<AddressVo | null> {
    const address = await this.addressRepo.findDefault(memberId);

    if (!address) {
      // 如果没有默认地址，返回第一个
      const first = await this.addressRepo.findOne({
        where: { memberId },
        orderBy: { createTime: 'desc' },
      });
      return first ? this.toVo(first) : null;
    }

    return this.toVo(address);
  }

  /**
   * 创建地址
   */
  async createAddress(memberId: string, dto: CreateAddressDto): Promise<AddressVo> {
    // 检查地址数量限制
    const count = await this.addressRepo.count({ memberId });
    BusinessException.throwIf(count >= this.MAX_ADDRESS_COUNT, `最多只能保存${this.MAX_ADDRESS_COUNT}个地址`);

    // 如果设为默认，先取消其他默认
    if (dto.isDefault) {
      await this.addressRepo.clearDefault(memberId);
    }

    // 如果是第一个地址，自动设为默认
    const isFirstAddress = count === 0;

    const address = await this.addressRepo.create({
      memberId,
      name: dto.name,
      phone: dto.phone,
      province: dto.province,
      city: dto.city,
      district: dto.district,
      detail: dto.detail,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isDefault: dto.isDefault || isFirstAddress,
      tag: dto.tag,
    });

    this.logger.log(`用户 ${memberId} 创建地址: ${address.id}`);

    return this.toVo(address);
  }

  /**
   * 更新地址
   */
  async updateAddress(memberId: string, dto: UpdateAddressDto): Promise<AddressVo> {
    // 校验地址归属
    const existing = await this.addressRepo.findOne({
      id: dto.id,
      memberId,
    });
    BusinessException.throwIfNull(existing, '地址不存在');

    // 如果设为默认，先取消其他默认
    if (dto.isDefault && !existing.isDefault) {
      await this.addressRepo.clearDefault(memberId);
    }

    const address = await this.addressRepo.update(dto.id, {
      name: dto.name,
      phone: dto.phone,
      province: dto.province,
      city: dto.city,
      district: dto.district,
      detail: dto.detail,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isDefault: dto.isDefault,
      tag: dto.tag,
    });

    this.logger.log(`用户 ${memberId} 更新地址: ${address.id}`);

    return this.toVo(address);
  }

  /**
   * 删除地址
   */
  async deleteAddress(memberId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({
      id: addressId,
      memberId,
    });
    BusinessException.throwIfNull(address, '地址不存在');

    await this.addressRepo.delete(addressId);

    // 如果删除的是默认地址，自动设置另一个为默认
    if (address.isDefault) {
      const first = await this.addressRepo.findOne({
        where: { memberId },
        orderBy: { createTime: 'desc' },
      });
      if (first) {
        await this.addressRepo.update(first.id, { isDefault: true });
      }
    }

    this.logger.log(`用户 ${memberId} 删除地址: ${addressId}`);
  }

  /**
   * 设为默认地址
   */
  async setDefaultAddress(memberId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({
      id: addressId,
      memberId,
    });
    BusinessException.throwIfNull(address, '地址不存在');

    // 取消其他默认
    await this.addressRepo.clearDefault(memberId);

    // 设置新默认
    await this.addressRepo.update(addressId, { isDefault: true });

    this.logger.log(`用户 ${memberId} 设置默认地址: ${addressId}`);
  }

  // ============ 私有方法 ============

  /**
   * 转换为 VO
   */
  private toVo(address: any): AddressVo {
    return {
      id: address.id,
      name: address.name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail: address.detail,
      fullAddress: `${address.province}${address.city}${address.district}${address.detail}`,
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: address.isDefault,
      tag: address.tag,
    };
  }
}
