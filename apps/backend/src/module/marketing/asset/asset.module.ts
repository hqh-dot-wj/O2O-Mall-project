import { Module } from '@nestjs/common';
import { UserAssetController } from './asset.controller';
import { UserAssetService } from './asset.service';
import { UserAssetRepository } from './asset.repository';

/**
 * 营销资产履约模块
 */
@Module({
  controllers: [UserAssetController],
  providers: [UserAssetService, UserAssetRepository],
  exports: [UserAssetService],
})
export class UserAssetModule {}
