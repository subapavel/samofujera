package cz.samofujera.order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
    private OrderDtos() {}

    public record CheckoutItem(
        @NotNull UUID productId,
        UUID variantId,
        @Min(1) int quantity
    ) {}

    public record OrderResponse(
        UUID id,
        String status,
        BigDecimal totalAmount,
        String currency,
        BigDecimal discountAmount,
        List<OrderItemResponse> items,
        ShippingResponse shipping,
        OffsetDateTime createdAt
    ) {}

    public record OrderItemResponse(
        UUID id,
        UUID productId,
        UUID variantId,
        String productTitle,
        String productType,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        String thumbnailUrl
    ) {}

    public record OrderListResponse(
        List<OrderResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
    ) {}

    public record ShippingResponse(
        String carrier,
        String trackingNumber,
        String trackingUrl,
        OffsetDateTime shippedAt,
        OffsetDateTime deliveredAt
    ) {}

    public record UpdateShippingRequest(
        @NotBlank String carrier,
        @NotBlank String trackingNumber,
        String trackingUrl
    ) {}
}
