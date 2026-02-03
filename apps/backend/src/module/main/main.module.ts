import { Module } from '@nestjs/common';
import { MainService } from './main.service';
import { MainController } from './main.controller';
import { AuthModule } from '../admin/auth/auth.module';
import { FinanceModule } from '../finance/finance.module';
import { StoreOrderRepository } from '../store/order/store-order.repository';
import { ProductRepository } from '../pms/product/product.repository';
import { MemberRepository } from '../admin/member/member.repository';

@Module({
  imports: [AuthModule, FinanceModule],
  controllers: [MainController],
  providers: [MainService, StoreOrderRepository, ProductRepository, MemberRepository],
  exports: [MainService],
})
export class MainModule {}
