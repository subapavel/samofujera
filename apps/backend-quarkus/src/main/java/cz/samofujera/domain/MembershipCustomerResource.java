package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.MembershipPlanEntity;
import cz.samofujera.domain.entity.SubscriptionEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/membership")
@ApplicationScoped
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class MembershipCustomerResource {

    @Inject
    SecurityIdentity identity;

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<MembershipDtos.MembershipOverview>>> getMembership() {
        Long userId = identity.getAttribute("user_id");

        return SubscriptionEntity.<SubscriptionEntity>findActiveByUserId(userId)
                .chain(subscription -> MembershipPlanEntity.<MembershipPlanEntity>findActivePlans()
                        .map(plans -> {
                            var planResponses = plans.stream()
                                    .map(MembershipDtos.PlanResponse::from)
                                    .toList();
                            var subResponse = subscription != null
                                    ? MembershipDtos.SubscriptionResponse.from(subscription)
                                    : null;
                            return RestResponse.ok(AuthDtos.ApiResponse.ok(
                                    new MembershipDtos.MembershipOverview(subResponse, planResponses)));
                        }));
    }

    @POST
    @Path("/subscribe")
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<RestResponse<Object>> subscribe(Object body) {
        // Stub - needs Stripe integration
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }

    @POST
    @Path("/cancel")
    public Uni<RestResponse<Object>> cancel() {
        // Stub - needs Stripe integration
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }
}
