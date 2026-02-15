package cz.samofujera.payment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public final class PaymentDtos {
    private PaymentDtos() {}

    public record CheckoutRequest(
        @NotNull List<CheckoutItem> items,
        String currency
    ) {}

    public record CheckoutItem(
        @NotNull UUID productId,
        UUID variantId,
        @Min(1) int quantity
    ) {}

    public record CheckoutResponse(
        String checkoutUrl,
        UUID orderId
    ) {}
}
