import { Module } from '@nestjs/common';
import { ServiceSlotController } from './service-slot.controller';
import { ServiceSlotService } from './service-slot.service';
import { RedisModule } from 'src/module/common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ServiceSlotController],
  providers: [ServiceSlotService],
  exports: [ServiceSlotService],
})
export class ServiceSlotModule {}
