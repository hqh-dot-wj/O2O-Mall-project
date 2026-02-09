import { Module } from '@nestjs/common';
import { GrayReleaseService } from './gray-release.service';

/**
 * 灰度发布模块
 * 
 * @description
 * 提供营销活动的灰度发布功能，支持：
 * - 白名单用户控制
 * - 白名单门店控制
 * - 基于用户ID哈希的百分比灰度
 * 
 * @module GrayModule
 * @验证需求 FR-7.2, US-6
 */
@Module({
  providers: [GrayReleaseService],
  exports: [GrayReleaseService],
})
export class GrayModule {}
