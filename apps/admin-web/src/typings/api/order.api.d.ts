/**
 * Api.Order - 来自 @libs/common-types
 */
import type {
  StoreOrderDetailVo,
  StoreOrderItemVo,
  StoreOrderListItemVo,
  StoreOrderSearchParams
} from '@libs/common-types';

declare namespace Api {
  namespace Order {
    type SearchParams = StoreOrderSearchParams;

    type OrderStatus =
      | 'PENDING_PAY'
      | 'PAID'
      | 'PENDING_SERVICE'
      | 'PENDING_DELIVERY'
      | 'SHIPPED'
      | 'COMPLETED'
      | 'CANCELLED'
      | 'REFUNDED';

    type OrderType = 'PRODUCT' | 'SERVICE';

    type OrderItem = StoreOrderListItemVo;

    type ListResult = Api.Common.PaginatingQueryRecord<OrderItem>;

    type OrderProductItem = StoreOrderItemVo;

    type CustomerInfo = NonNullable<StoreOrderDetailVo['customer']>;

    type WorkerInfo = NonNullable<StoreOrderDetailVo['worker']>;

    type CommissionInfo = NonNullable<StoreOrderDetailVo['commissions']>[number];

    type DetailResult = StoreOrderDetailVo;
  }
}
