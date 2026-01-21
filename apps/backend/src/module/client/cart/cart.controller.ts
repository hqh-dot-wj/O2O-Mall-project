import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Query,
    Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { CartService } from './cart.service';
import { AddCartDto, UpdateCartQuantityDto } from './dto/cart.dto';
import { CartListVo, CartItemVo } from './vo/cart.vo';
import { Member } from '../common/decorators/member.decorator';

import { MemberAuthGuard } from '../common/guards/member-auth.guard';
import { UseGuards } from '@nestjs/common';

/**
 * C端购物车控制器
 */
@ApiTags('C端-购物车')
@UseGuards(MemberAuthGuard)
@Controller('client/cart')
export class CartController {
    constructor(private readonly cartService: CartService) { }

    /**
     * 添加商品到购物车
     */
    @Post('add')
    @Api({ summary: '添加到购物车', type: CartItemVo })
    async addToCart(@Member('memberId') memberId: string, @Body() dto: AddCartDto) {
        return await this.cartService.addToCart(memberId, dto);
    }

    /**
     * 获取购物车列表
     */
    @Get('list')
    @Api({ summary: '获取购物车列表', type: CartListVo })
    async getCartList(
        @Member('memberId') memberId: string,
        @Query('tenantId') tenantId: string,
    ) {
        return await this.cartService.getCartList(memberId, tenantId);
    }

    /**
     * 更新购物车商品数量
     */
    @Put('quantity')
    @Api({ summary: '更新购物车数量', type: CartItemVo })
    async updateQuantity(
        @Member('memberId') memberId: string,
        @Query('tenantId') tenantId: string,
        @Body() dto: UpdateCartQuantityDto,
    ) {
        return await this.cartService.updateQuantity(memberId, tenantId, dto);
    }

    /**
     * 删除购物车商品
     */
    @Delete(':skuId')
    @Api({ summary: '删除购物车商品' })
    async removeItem(
        @Member('memberId') memberId: string,
        @Query('tenantId') tenantId: string,
        @Param('skuId') skuId: string,
    ) {
        return await this.cartService.removeItem(memberId, tenantId, skuId);
    }

    /**
     * 清空购物车
     */
    @Delete('clear')
    @Api({ summary: '清空购物车' })
    async clearCart(
        @Member('memberId') memberId: string,
        @Query('tenantId') tenantId: string,
    ) {
        return await this.cartService.clearCart(memberId, tenantId);
    }

    /**
     * 获取购物车商品数量 (用于 Tabbar 角标)
     */
    @Get('count')
    @Api({ summary: '获取购物车数量' })
    async getCartCount(
        @Member('memberId') memberId: string,
        @Query('tenantId') tenantId: string,
    ) {
        const count = await this.cartService.getCartCount(memberId, tenantId);
        return { count };
    }
}
