import { Controller, Get, Post, Body, Query, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Api } from 'src/common/decorators/api.decorator';
import { RequirePermission } from 'src/module/admin/common/decorators/require-permission.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { Operlog } from 'src/module/admin/common/decorators/operlog.decorator';
import { BusinessType } from 'src/common/constant/business.constant';
import { StoreOrderService } from './store-order.service';
import {
  ListStoreOrderDto,
  ReassignWorkerDto,
  VerifyServiceDto,
  RefundOrderDto,
  PartialRefundOrderDto,
  BatchVerifyDto,
  BatchRefundDto,
} from './dto/store-order.dto';

/**
 * Store端订单管理控制器
 */
@ApiTags('Store-订单管理')
@Controller('store/order')
export class StoreOrderController {
  constructor(private readonly storeOrderService: StoreOrderService) {}

  /**
   * 查询订单列表
   */
  @Get('list')
  @Api({ summary: '查询订单列表' })
  @RequirePermission('store:order:list')
  async findAll(@Query() query: ListStoreOrderDto) {
    return await this.storeOrderService.findAll(query);
  }

  /**
   * 查询订单详情
   */
  @Get('detail/:id')
  @Api({ summary: '查询订单详情' })
  @RequirePermission('store:order:query')
  async findOne(@Param('id') id: string) {
    // 默认允许查看佣金
    const canViewCommission = true;
    return await this.storeOrderService.findOne(id, canViewCommission);
  }

  /**
   * 获取待派单列表
   */
  @Get('dispatch/list')
  @Api({ summary: '获取待派单列表' })
  @RequirePermission('store:order:dispatch')
  async getDispatchList(@Query() query: ListStoreOrderDto) {
    return await this.storeOrderService.getDispatchList(query);
  }

  /**
   * 改派技师
   */
  @Post('reassign')
  @Api({ summary: '改派技师' })
  @RequirePermission('store:order:dispatch')
  @Operlog({ businessType: BusinessType.UPDATE })
  async reassignWorker(@Body() dto: ReassignWorkerDto, @User('userId') userId: string) {
    return await this.storeOrderService.reassignWorker(dto, userId);
  }

  /**
   * 强制核销
   */
  @Post('verify')
  @Api({ summary: '强制核销' })
  @RequirePermission('store:order:verify')
  async verifyService(@Body() dto: VerifyServiceDto, @User('userId') userId: string) {
    return await this.storeOrderService.verifyService(dto, userId);
  }

  /**
   * 订单退款
   */
  @Post('refund')
  @Api({ summary: '订单退款' })
  @RequirePermission('store:order:refund')
  @Operlog({ businessType: BusinessType.UPDATE })
  async refundOrder(@Body() dto: RefundOrderDto, @User('userId') userId: string) {
    return await this.storeOrderService.refundOrder(dto.orderId, dto.remark || '', userId);
  }

  /**
   * 部分退款
   */
  @Post('refund/partial')
  @Api({ summary: '部分退款' })
  @RequirePermission('store:order:refund')
  @Operlog({ businessType: BusinessType.UPDATE })
  async partialRefundOrder(@Body() dto: PartialRefundOrderDto, @User('userId') userId: string) {
    return await this.storeOrderService.partialRefundOrder(dto, userId);
  }

  /**
   * 导出订单数据
   */
  @Get('export')
  @Api({ summary: '导出订单数据' })
  @RequirePermission('store:order:export')
  async exportOrders(@Query() query: ListStoreOrderDto, @Res() res: Response) {
    return await this.storeOrderService.exportOrders(query, res);
  }

  /**
   * 批量核销
   */
  @Post('batch/verify')
  @Api({ summary: '批量核销' })
  @RequirePermission('store:order:verify')
  @Operlog({ businessType: BusinessType.UPDATE })
  async batchVerify(@Body() dto: BatchVerifyDto, @User('userId') userId: string) {
    return await this.storeOrderService.batchVerify(dto, userId);
  }

  /**
   * 批量退款
   */
  @Post('batch/refund')
  @Api({ summary: '批量退款' })
  @RequirePermission('store:order:refund')
  @Operlog({ businessType: BusinessType.UPDATE })
  async batchRefund(@Body() dto: BatchRefundDto, @User('userId') userId: string) {
    return await this.storeOrderService.batchRefund(dto, userId);
  }

}
