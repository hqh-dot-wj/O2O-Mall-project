import { OrderForMarketing } from 'src/module/marketing/integration/types/order-for-marketing.type';

export const ORDER_SERVICE = Symbol('ORDER_SERVICE');

export interface OrderServiceContract {
  findByIdForMarketing(orderId: string, includeItems?: boolean): Promise<OrderForMarketing | null>;
  updateOrderPointsEarned(
    orderId: string,
    itemPoints: Array<{ skuId: string; earnedPoints: number }>,
    totalPoints: number,
  ): Promise<void>;
}
