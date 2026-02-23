package cz.samofujera.membership;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class MembershipDtos {

    private MembershipDtos() {}

    public record PlanResponse(
        UUID id,
        String name,
        String slug,
        String description,
        String stripePriceIdCzk,
        String stripePriceIdEur,
        Object features,
        int sortOrder,
        boolean active,
        OffsetDateTime createdAt
    ) {}

    public record CreatePlanRequest(
        String name,
        String slug,
        String description,
        String stripePriceIdCzk,
        String stripePriceIdEur,
        Object features,
        int sortOrder
    ) {}

    public record UpdatePlanRequest(
        String name,
        String description,
        String stripePriceIdCzk,
        String stripePriceIdEur,
        Object features,
        Integer sortOrder,
        Boolean active
    ) {}

    public record SubscriptionResponse(
        UUID id,
        UUID userId,
        UUID planId,
        String planName,
        String status,
        OffsetDateTime currentPeriodStart,
        OffsetDateTime currentPeriodEnd,
        OffsetDateTime cancelledAt
    ) {}

    public record SubscribeRequest(
        String planSlug,
        String currency
    ) {}

    public record CheckoutUrlResponse(
        String url
    ) {}
}
