package cz.samofujera.domain;

import cz.samofujera.domain.entity.MembershipPlanEntity;
import cz.samofujera.domain.entity.SubscriptionEntity;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
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
            String features,
            int sortOrder,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) {
        public static PlanResponse from(MembershipPlanEntity plan) {
            return new PlanResponse(
                    plan.id, plan.name, plan.slug, plan.description,
                    plan.stripePriceIdCzk, plan.stripePriceIdEur,
                    plan.features, plan.sortOrder, plan.active,
                    plan.createdAt, plan.updatedAt
            );
        }
    }

    public record SubscriptionResponse(
            UUID id,
            Long userId,
            UUID planId,
            String stripeSubscriptionId,
            String status,
            Instant currentPeriodStart,
            Instant currentPeriodEnd,
            Instant cancelledAt,
            Instant createdAt
    ) {
        public static SubscriptionResponse from(SubscriptionEntity sub) {
            return new SubscriptionResponse(
                    sub.id, sub.userId, sub.planId,
                    sub.stripeSubscriptionId, sub.status,
                    sub.currentPeriodStart, sub.currentPeriodEnd,
                    sub.cancelledAt, sub.createdAt
            );
        }
    }

    public record MembershipOverview(
            SubscriptionResponse subscription,
            List<PlanResponse> plans
    ) {}

    public record CreatePlanRequest(
            @NotBlank String name,
            @NotBlank String slug,
            String description,
            String stripePriceIdCzk,
            String stripePriceIdEur,
            String features,
            int sortOrder,
            boolean active
    ) {}

    public record UpdatePlanRequest(
            String name,
            String slug,
            String description,
            String stripePriceIdCzk,
            String stripePriceIdEur,
            String features,
            Integer sortOrder,
            Boolean active
    ) {}
}
