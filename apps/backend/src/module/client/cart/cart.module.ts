import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

/**
 * C端购物车模块
 */
@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class ClientCartModule {}
