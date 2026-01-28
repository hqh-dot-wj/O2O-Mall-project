import { Module } from '@nestjs/common';
import { ClientProductController } from './product.controller';
import { ClientProductService } from './product.service';
import { PrismaModule } from 'src/prisma/prisma.module';

import { MarketingPlayModule } from 'src/module/marketing/play/play.module';

import { ClientProductRepository } from './product.repository';

@Module({
  imports: [PrismaModule, MarketingPlayModule],
  controllers: [ClientProductController],
  providers: [ClientProductService, ClientProductRepository],
  exports: [ClientProductService, ClientProductRepository],
})
export class ClientProductModule {}
