package cz.samofujera.membership;

import com.stripe.exception.StripeException;
import com.stripe.param.checkout.SessionCreateParams;
import cz.samofujera.membership.internal.PlanRepository;
import cz.samofujera.membership.internal.StripeSubscriptionClient;
import cz.samofujera.membership.internal.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MembershipService {

    private static final Logger log = LoggerFactory.getLogger(MembershipService.class);

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StripeSubscriptionClient stripeSubscriptionClient;

    @Value("${app.frontend.url:http://localhost:4321}")
    private String frontendUrl;

    MembershipService(PlanRepository planRepository,
                      SubscriptionRepository subscriptionRepository,
                      StripeSubscriptionClient stripeSubscriptionClient) {
        this.planRepository = planRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.stripeSubscriptionClient = stripeSubscriptionClient;
    }

    public List<MembershipDtos.PlanResponse> getPlans() {
        return planRepository.findAll().stream()
            .map(this::toPlanResponse)
            .toList();
    }

    public List<MembershipDtos.PlanResponse> getActivePlans() {
        return planRepository.findAll().stream()
            .filter(p -> p.active())
            .map(this::toPlanResponse)
            .toList();
    }

    @Transactional
    public MembershipDtos.PlanResponse createPlan(MembershipDtos.CreatePlanRequest request) {
        var id = planRepository.create(
            request.name(),
            request.slug(),
            request.description(),
            request.stripePriceIdCzk(),
            request.stripePriceIdEur(),
            request.features(),
            request.sortOrder()
        );
        return toPlanResponse(planRepository.findById(id));
    }

    @Transactional
    public MembershipDtos.PlanResponse updatePlan(UUID id, MembershipDtos.UpdatePlanRequest request) {
        planRepository.update(
            id,
            request.name(),
            request.description(),
            request.stripePriceIdCzk(),
            request.stripePriceIdEur(),
            request.features(),
            request.sortOrder(),
            request.active()
        );
        return toPlanResponse(planRepository.findById(id));
    }

    public MembershipDtos.SubscriptionResponse getSubscription(UUID userId) {
        var sub = subscriptionRepository.findActiveByUserId(userId);
        if (sub == null) return null;
        return toSubscriptionResponse(sub);
    }

    public MembershipDtos.CheckoutUrlResponse subscribe(UUID userId, String userEmail,
                                                          MembershipDtos.SubscribeRequest request) {
        var plan = planRepository.findBySlug(request.planSlug());
        if (plan == null) {
            throw new IllegalArgumentException("Plan not found: " + request.planSlug());
        }

        String currency = request.currency() != null ? request.currency().toUpperCase() : "CZK";
        String stripePriceId = "EUR".equals(currency) ? plan.stripePriceIdEur() : plan.stripePriceIdCzk();

        if (stripePriceId == null || stripePriceId.isBlank()) {
            throw new IllegalArgumentException("No Stripe price configured for currency: " + currency);
        }

        var params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
            .setCustomerEmail(userEmail)
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setPrice(stripePriceId)
                .setQuantity(1L)
                .build())
            .setSuccessUrl(frontendUrl + "/muj-ucet/predplatne?success=true")
            .setCancelUrl(frontendUrl + "/muj-ucet/predplatne?cancelled=true")
            .putMetadata("user_id", userId.toString())
            .putMetadata("plan_id", plan.id().toString())
            .build();

        try {
            var session = stripeSubscriptionClient.createSubscriptionCheckout(params);
            log.info("Created subscription checkout session {} for user {} plan {}",
                session.getId(), userId, plan.slug());
            return new MembershipDtos.CheckoutUrlResponse(session.getUrl());
        } catch (StripeException e) {
            log.error("Failed to create subscription checkout for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to create subscription checkout", e);
        }
    }

    @Transactional
    public void cancelSubscription(UUID userId) {
        var sub = subscriptionRepository.findActiveByUserId(userId);
        if (sub == null) {
            throw new IllegalArgumentException("No active subscription found");
        }

        if (sub.stripeSubscriptionId() != null) {
            try {
                stripeSubscriptionClient.cancelSubscription(sub.stripeSubscriptionId());
            } catch (StripeException e) {
                log.error("Failed to cancel Stripe subscription {}: {}", sub.stripeSubscriptionId(), e.getMessage());
                throw new RuntimeException("Failed to cancel subscription", e);
            }
        }

        subscriptionRepository.update(sub.id(), "CANCELLED", null, null, OffsetDateTime.now());
        log.info("Cancelled subscription {} for user {}", sub.id(), userId);
    }

    @Transactional
    public void handleSubscriptionCreated(com.stripe.model.Subscription stripeSubscription) {
        var metadata = stripeSubscription.getMetadata();
        var userId = UUID.fromString(metadata.get("user_id"));
        var planId = UUID.fromString(metadata.get("plan_id"));

        var period = extractPeriodFromItems(stripeSubscription);

        var id = subscriptionRepository.create(
            userId, planId, stripeSubscription.getId(),
            mapStripeStatus(stripeSubscription.getStatus()),
            period[0], period[1]
        );

        log.info("Created subscription {} for user {} plan {} (Stripe: {})",
            id, userId, planId, stripeSubscription.getId());
    }

    @Transactional
    public void handleSubscriptionUpdated(com.stripe.model.Subscription stripeSubscription) {
        var sub = subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId());
        if (sub == null) {
            log.warn("Received update for unknown Stripe subscription: {}", stripeSubscription.getId());
            return;
        }

        var period = extractPeriodFromItems(stripeSubscription);
        var status = mapStripeStatus(stripeSubscription.getStatus());

        subscriptionRepository.update(sub.id(), status, period[0], period[1], null);
        log.info("Updated subscription {} status={} period={}-{}",
            sub.id(), status, period[0], period[1]);
    }

    @Transactional
    public void handleSubscriptionDeleted(com.stripe.model.Subscription stripeSubscription) {
        var sub = subscriptionRepository.findByStripeSubscriptionId(stripeSubscription.getId());
        if (sub == null) {
            log.warn("Received deletion for unknown Stripe subscription: {}", stripeSubscription.getId());
            return;
        }

        subscriptionRepository.update(sub.id(), "CANCELLED", null, null, OffsetDateTime.now());
        log.info("Marked subscription {} as cancelled (Stripe: {})", sub.id(), stripeSubscription.getId());
    }

    /**
     * Get the features JSONB map from the user's active subscription plan.
     * Returns null if the user has no active subscription.
     * Used by AccessChecker for Layer 2 access checks.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getActiveSubscriptionFeatures(UUID userId) {
        var sub = subscriptionRepository.findActiveByUserId(userId);
        if (sub == null) return null;

        var plan = planRepository.findById(sub.planId());
        if (plan == null || plan.features() == null) return null;

        if (plan.features() instanceof Map<?, ?> featuresMap) {
            return (Map<String, Object>) featuresMap;
        }

        return null;
    }

    public Object getPlanFeatures(UUID planId) {
        var plan = planRepository.findById(planId);
        return plan != null ? plan.features() : null;
    }

    private MembershipDtos.PlanResponse toPlanResponse(PlanRepository.PlanRow row) {
        return new MembershipDtos.PlanResponse(
            row.id(),
            row.name(),
            row.slug(),
            row.description(),
            row.stripePriceIdCzk(),
            row.stripePriceIdEur(),
            row.features(),
            row.sortOrder(),
            row.active(),
            row.createdAt()
        );
    }

    private MembershipDtos.SubscriptionResponse toSubscriptionResponse(SubscriptionRepository.SubscriptionRow row) {
        var plan = planRepository.findById(row.planId());
        return new MembershipDtos.SubscriptionResponse(
            row.id(),
            row.userId(),
            row.planId(),
            plan != null ? plan.name() : null,
            row.status(),
            row.currentPeriodStart(),
            row.currentPeriodEnd(),
            row.cancelledAt()
        );
    }

    private String mapStripeStatus(String stripeStatus) {
        return switch (stripeStatus) {
            case "active", "trialing" -> "ACTIVE";
            case "past_due" -> "PAST_DUE";
            case "canceled", "unpaid" -> "CANCELLED";
            case "incomplete", "incomplete_expired" -> "INCOMPLETE";
            default -> stripeStatus.toUpperCase();
        };
    }

    private OffsetDateTime[] extractPeriodFromItems(com.stripe.model.Subscription stripeSubscription) {
        // In Stripe SDK v30+, period is on SubscriptionItem, not Subscription
        var items = stripeSubscription.getItems();
        if (items != null && items.getData() != null && !items.getData().isEmpty()) {
            var firstItem = items.getData().getFirst();
            return new OffsetDateTime[]{
                toOffsetDateTime(firstItem.getCurrentPeriodStart()),
                toOffsetDateTime(firstItem.getCurrentPeriodEnd())
            };
        }
        // Fallback: use subscription created time + 30 days
        var start = toOffsetDateTime(stripeSubscription.getCreated());
        return new OffsetDateTime[]{
            start,
            start != null ? start.plusDays(30) : null
        };
    }

    private OffsetDateTime toOffsetDateTime(Long epochSeconds) {
        if (epochSeconds == null) return null;
        return Instant.ofEpochSecond(epochSeconds).atOffset(ZoneOffset.UTC);
    }
}
