package cz.samofujera.domain;

import cz.samofujera.domain.entity.OrderEntity;
import cz.samofujera.domain.entity.OrderItemEntity;
import cz.samofujera.domain.entity.ShippingRecordEntity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
    private OrderDtos() {}

    public record OrderResponse(
            UUID id,
            Long userId,
            String status,
            BigDecimal totalAmount,
            String currency,
            BigDecimal discountAmount,
            String stripePaymentId,
            String billingAddress,
            String shippingAddress,
            String locale,
            Instant createdAt,
            Instant updatedAt,
            List<OrderItemResponse> items,
            ShippingResponse shipping
    ) {
        public static OrderResponse from(OrderEntity order, List<OrderItemEntity> items, ShippingRecordEntity shipping) {
            return new OrderResponse(
                    order.id,
                    order.userId,
                    order.status,
                    order.totalAmount,
                    order.currency,
                    order.discountAmount,
                    order.stripePaymentId,
                    order.billingAddress,
                    order.shippingAddress,
                    order.locale,
                    order.createdAt,
                    order.updatedAt,
                    items.stream().map(OrderItemResponse::from).toList(),
                    shipping != null ? ShippingResponse.from(shipping) : null
            );
        }
    }

    public record OrderItemResponse(
            UUID id,
            UUID orderId,
            UUID productId,
            UUID variantId,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal totalPrice,
            String productSnapshot,
            Instant createdAt
    ) {
        public static OrderItemResponse from(OrderItemEntity item) {
            return new OrderItemResponse(
                    item.id, item.orderId, item.productId, item.variantId,
                    item.quantity, item.unitPrice, item.totalPrice,
                    item.productSnapshot, item.createdAt
            );
        }
    }

    public record OrderListResponse(
            UUID id,
            Long userId,
            String status,
            BigDecimal totalAmount,
            String currency,
            Instant createdAt,
            List<OrderItemResponse> items
    ) {
        public static OrderListResponse from(OrderEntity order, List<OrderItemEntity> items) {
            return new OrderListResponse(
                    order.id, order.userId, order.status,
                    order.totalAmount, order.currency, order.createdAt,
                    items.stream().map(OrderItemResponse::from).toList()
            );
        }
    }

    public record ShippingResponse(
            UUID id,
            UUID orderId,
            String carrier,
            String trackingNumber,
            String trackingUrl,
            Instant shippedAt,
            Instant deliveredAt,
            Instant createdAt
    ) {
        public static ShippingResponse from(ShippingRecordEntity s) {
            return new ShippingResponse(
                    s.id, s.orderId, s.carrier, s.trackingNumber,
                    s.trackingUrl, s.shippedAt, s.deliveredAt, s.createdAt
            );
        }
    }

    public record UpdateShippingRequest(
            @NotBlank String carrier,
            String trackingNumber,
            String trackingUrl
    ) {}

    public record CheckoutItem(
            @NotNull UUID productId,
            UUID variantId,
            int quantity
    ) {}

    public record CreateOrderRequest(
            List<CheckoutItem> items,
            String currency,
            String billingAddress,
            String shippingAddress,
            String locale
    ) {}
}
