import { Module, Global } from '@nestjs/common';
import { RiskService } from './risk.service';

@Global()
@Module({
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
