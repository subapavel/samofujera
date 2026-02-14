package cz.samofujera.order.event;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrderPaidEvent(
    UUID orderId,
    UUID userId,
    String userEmail,
    String userName,
    BigDecimal totalAmount,
    String currency,
    List<OrderItem> items
) {
    public record OrderItem(UUID productId, String productTitle, String productType, int quantity) {}
}
