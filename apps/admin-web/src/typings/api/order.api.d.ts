/**
 * Namespace Api.Order
 *
 * 订单管理 API 类型定义
 */
declare namespace Api {
  namespace Order {
    /** 订单搜索参数 */
    interface SearchParams extends Common.CommonSearchParams {
      /** 订单号 */
      orderSn?: string | null;
      /** 收货人手机 */
      receiverPhone?: string | null;
      /** 订单状态 */
      status?: OrderStatus | null;
      /** 订单类型 */
      orderType?: OrderType | null;
      /** 会员ID */
      memberId?: string | null;
    }

    /** 订单状态 */
    type OrderStatus =
      | 'PENDING_PAY'
      | 'PAID'
      | 'PENDING_SERVICE'
      | 'PENDING_DELIVERY'
      | 'SHIPPED'
      | 'COMPLETED'
      | 'CANCELLED'
      | 'REFUNDED';

    /** 订单类型 */
    type OrderType = 'PRODUCT' | 'SERVICE';

    /** 订单列表项 */
    interface OrderItem {
      /** 订单ID */
      id: string;
      /** 订单号 */
      orderSn: string;
      /** 订单类型 */
      orderType: OrderType;
      /** 订单状态 */
      status: OrderStatus;
      /** 收货人 */
      receiverName: string;
      /** 收货人电话 */
      receiverPhone: string;
      /** 收货地址 */
      receiverAddress: string;
      /** 商品总金额 */
      totalAmount: number;
      /** 运费 */
      freightAmount: number;
      /** 优惠金额 */
      discountAmount: number;
      /** 实付金额 */
      payAmount: number;
      /** 创建时间 */
      createTime: string;
      /** 商品主图 */
      productImg: string;
      /** 佣金金额 */
      commissionAmount: number;
      /** 商户收款金额（支付金额 - 佣金总额） */
      remainingAmount: number;
      /** 所属租户 */
      tenantName: string;
    }

    /** 订单列表返回 */
    type ListResult = Common.PaginatingQueryRecord<OrderItem>;

    /** 订单商品明细 */
    interface OrderProductItem {
      id: string;
      productId: string;
      productName: string;
      productImg: string;
      skuId: string;
      specData: Record<string, string>;
      price: number;
      quantity: number;
      totalAmount: number;
    }

    /** 客户信息 */
    interface CustomerInfo {
      id: string;
      nickname: string;
      mobile: string;
      avatar?: string;
    }

    /** 技师信息 */
    interface WorkerInfo {
      id: number;
      name: string;
      phone: string;
      avatar?: string;
      rating?: number;
    }

    /** 归因信息 */
    interface AttributionInfo {
      shareUser?: {
        id: string;
        nickname: string;
      };
      referrerId?: string;
    }

    /** 佣金明细 */
    interface CommissionInfo {
      id: string;
      beneficiaryId: string;
      beneficiary?: {
        nickname: string;
        avatar?: string;
      };
      level: 1 | 2;
      amount: number;
      rateSnapshot: number;
      status: 'FROZEN' | 'SETTLED' | 'CANCELLED';
      planSettleTime: string;
    }

    /** 订单详情返回 */
    interface DetailResult {
      order: OrderItem & {
        items: OrderProductItem[];
        remark?: string;
        bookingTime?: string;
      };
      customer?: CustomerInfo;
      worker?: WorkerInfo;
      attribution?: AttributionInfo;
      commissions?: CommissionInfo[];
    }
  }
}
