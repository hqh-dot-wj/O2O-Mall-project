import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { OrderService } from './order.service';
import { CreateOrderDto, ListOrderDto, CancelOrderDto, OrderItemDto } from './dto/order.dto';
import { OrderDetailVo, OrderListItemVo, CheckoutPreviewVo } from './vo/order.vo';
import { Member } from '../common/decorators/member.decorator';
import { MemberAuthGuard } from '../common/guards/member-auth.guard';
import { Result } from 'src/common/response';
import { ClientInfo, ClientInfoDto } from 'src/common/decorators/common.decorator';

/**
 * C端订单控制器
 */
@ApiTags('C端-订单')
@Controller('client/order')
@UseGuards(MemberAuthGuard)
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    /**
     * 结算预览
     */
    @Post('checkout/preview')
    @Api({ summary: '结算预览', type: CheckoutPreviewVo })
    async checkoutPreview(
        @Member('memberId') memberId: string,
        @Body() body: { tenantId: string; items: OrderItemDto[] },
    ) {
        const preview = await this.orderService.getCheckoutPreview(
            memberId,
            body.tenantId,
            body.items,
        );
        return Result.ok(preview);
    }

    /**
     * 创建订单
     */
    @Post('create')
    @Api({ summary: '创建订单' })
    async createOrder(
        @Member('memberId') memberId: string,
        @Body() dto: CreateOrderDto,
        @ClientInfo() clientInfo: ClientInfoDto,
    ) {
        return await this.orderService.createOrder(memberId, dto, clientInfo);
    }

    /**
     * 获取订单列表
     */
    @Get('list')
    @Api({ summary: '订单列表', type: OrderListItemVo })
    async getOrderList(
        @Member('memberId') memberId: string,
        @Query() dto: ListOrderDto,
    ) {
        return await this.orderService.getOrderList(memberId, dto);
    }

    /**
     * 获取订单详情
     */
    @Get(':id')
    @Api({ summary: '订单详情', type: OrderDetailVo })
    async getOrderDetail(
        @Member('memberId') memberId: string,
        @Param('id') orderId: string,
    ) {
        const detail = await this.orderService.getOrderDetail(memberId, orderId);
        return Result.ok(detail);
    }

    /**
     * 取消订单
     */
    @Post('cancel')
    @Api({ summary: '取消订单' })
    async cancelOrder(
        @Member('memberId') memberId: string,
        @Body() dto: CancelOrderDto,
    ) {
        return await this.orderService.cancelOrder(memberId, dto);
    }

    /**
     * 确认收货
     */
    @Post('confirm')
    @Api({ summary: '确认收货' })
    async confirmReceipt(
        @Member('memberId') memberId: string,
        @Body() dto: { orderId: string },
    ) {
        return await this.orderService.confirmReceipt(memberId, dto.orderId);
    }
}
