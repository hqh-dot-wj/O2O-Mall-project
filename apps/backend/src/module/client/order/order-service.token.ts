export const ORDER_SERVICE = Symbol('ORDER_SERVICE');

export interface OrderServiceContract {
  findByIdForMarketing(orderId: string, includeItems?: boolean): Promise<unknown>;
  updateOrderPointsEarned(
    orderId: string,
    itemPoints: Array<{ skuId: string; earnedPoints: number }>,
    totalPoints: number,
  ): Promise<void>;
}
