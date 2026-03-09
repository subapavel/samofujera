package cz.samofujera.auth;

import cz.samofujera.security.SessionService;
import cz.samofujera.security.entity.UserEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/admin/impersonate")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class ImpersonationResource {

    @Inject
    SessionService sessionService;

    @Inject
    SecurityIdentity identity;

    public record ImpersonationStatus(boolean active, String userId, String email, String name) {}

    @GET
    @Path("/status")
    @Authenticated
    public Uni<RestResponse<AuthDtos.ApiResponse<ImpersonationStatus>>> getStatus() {
        boolean impersonated = Boolean.TRUE.equals(identity.getAttribute("is_impersonated"));
        if (!impersonated) {
            return Uni.createFrom().item(
                    RestResponse.ok(AuthDtos.ApiResponse.ok(
                            new ImpersonationStatus(false, null, null, null))));
        }
        Long userId = identity.getAttribute("user_id");
        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok(
                new ImpersonationStatus(
                        true,
                        userId != null ? userId.toString() : null,
                        identity.getPrincipal().getName(),
                        null
                ))));
    }

    @POST
    @Path("/{userId}")
    @RolesAllowed("ADMIN")
    @WithSession
    public Uni<RestResponse<AuthDtos.UserResponse>> startImpersonation(
            @PathParam("userId") Long userId,
            RoutingContext context) {

        var sessionCookie = context.request().getCookie("SESSION_ID");
        if (sessionCookie == null) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.UNAUTHORIZED));
        }

        return UserEntity.<UserEntity>findById(userId)
                .onItem().ifNotNull().transformToUni(targetUser ->
                        sessionService.setImpersonation(sessionCookie.getValue(), userId)
                                .map(v -> RestResponse.ok(
                                        AuthDtos.UserResponse.from(targetUser)))
                )
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @POST
    @Path("/stop")
    @RolesAllowed("ADMIN")
    @WithSession
    public Uni<RestResponse<AuthDtos.UserResponse>> stopImpersonation(
            RoutingContext context) {

        Long originalUserId = identity.getAttribute("original_user_id");
        if (originalUserId == null) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.BAD_REQUEST));
        }

        var sessionCookie = context.request().getCookie("SESSION_ID");
        if (sessionCookie == null) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.UNAUTHORIZED));
        }

        return sessionService.setImpersonation(sessionCookie.getValue(), null)
                .chain(() -> UserEntity.<UserEntity>findById(originalUserId))
                .map(user -> RestResponse.ok(
                        AuthDtos.UserResponse.from(user)));
    }
}
