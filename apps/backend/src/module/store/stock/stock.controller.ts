import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { StockService } from './stock.service';
import { CurrentTenant } from '@src/common/tenant/tenant.decorator';
import { ListStockDto, UpdateStockDto } from './dto';
import { StockVo } from './vo';

@ApiTags('库存管理')
@Controller('store/stock')
export class StockController {
  constructor(private readonly stockService: StockService) { }

  @Api({ summary: '获取库存列表', type: StockVo, isPager: true })
  @Post('list')
  async getList(@CurrentTenant() tenantId: string, @Body() dto: ListStockDto) {
    return this.stockService.findAll(tenantId, dto);
  }

  @Api({ summary: '更新库存' })
  @Post('update')
  async update(@CurrentTenant() tenantId: string, @Body() dto: UpdateStockDto) {
    return this.stockService.updateStock(tenantId, dto);
  }
}
