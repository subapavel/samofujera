package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.MembershipPlanEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.UUID;

@Path("/api/admin/membership/plans")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class MembershipAdminResource {

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<MembershipDtos.PlanResponse>>>> listPlans() {
        return MembershipPlanEntity.findActivePlans()
                .onItem().transform(plans -> {
                    var responses = plans.stream()
                            .map(MembershipDtos.PlanResponse::from)
                            .toList();
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(responses));
                });
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<MembershipDtos.PlanResponse>>> createPlan(
            @Valid MembershipDtos.CreatePlanRequest request) {

        var plan = new MembershipPlanEntity();
        plan.name = request.name();
        plan.slug = request.slug();
        plan.description = request.description();
        plan.stripePriceIdCzk = request.stripePriceIdCzk();
        plan.stripePriceIdEur = request.stripePriceIdEur();
        plan.features = request.features() != null ? request.features() : "{}";
        plan.sortOrder = request.sortOrder();
        plan.active = request.active();

        return plan.<MembershipPlanEntity>persist()
                .onItem().transform(saved -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(MembershipDtos.PlanResponse.from(saved))));
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<MembershipDtos.PlanResponse>>> updatePlan(
            @PathParam("id") UUID id,
            @Valid MembershipDtos.UpdatePlanRequest request) {

        return MembershipPlanEntity.<MembershipPlanEntity>findById(id)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(plan -> {
                    if (plan == null) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<MembershipDtos.PlanResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    if (request.name() != null) plan.name = request.name();
                    if (request.slug() != null) plan.slug = request.slug();
                    if (request.description() != null) plan.description = request.description();
                    if (request.stripePriceIdCzk() != null) plan.stripePriceIdCzk = request.stripePriceIdCzk();
                    if (request.stripePriceIdEur() != null) plan.stripePriceIdEur = request.stripePriceIdEur();
                    if (request.features() != null) plan.features = request.features();
                    if (request.sortOrder() != null) plan.sortOrder = request.sortOrder();
                    if (request.active() != null) plan.active = request.active();

                    return plan.<MembershipPlanEntity>persist()
                            .onItem().transform(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(MembershipDtos.PlanResponse.from(saved))));
                });
    }
}
