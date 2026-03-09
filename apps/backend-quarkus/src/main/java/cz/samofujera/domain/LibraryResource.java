package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.EntitlementEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.UUID;

@Path("/api/library")
@ApplicationScoped
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class LibraryResource {

    @Inject
    SecurityIdentity identity;

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<LibraryDtos.EntitlementResponse>>>> getLibrary() {
        Long userId = identity.getAttribute("user_id");

        return EntitlementEntity.findActiveByUserId(userId)
                .onItem().transform(entitlements -> {
                    var responses = entitlements.stream()
                            .map(LibraryDtos.EntitlementResponse::from)
                            .toList();
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(responses));
                });
    }

    @GET
    @Path("/{productId}/content")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<Object>>>> getProductContent(
            @PathParam("productId") UUID productId) {

        Long userId = identity.getAttribute("user_id");

        return EntitlementEntity.findActiveForUserAndEntity(userId, "PRODUCT", productId)
                .onItem().transform(entitlement -> {
                    if (entitlement == null) {
                        return RestResponse.<AuthDtos.ApiResponse<List<Object>>>status(
                                RestResponse.Status.FORBIDDEN);
                    }
                    // Return empty list - actual content loading would query product_content table
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(List.<Object>of()));
                });
    }

    @GET
    @Path("/{productId}/event")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<Object>>> getProductEvent(
            @PathParam("productId") UUID productId) {

        Long userId = identity.getAttribute("user_id");

        return EntitlementEntity.findActiveForUserAndEntity(userId, "PRODUCT", productId)
                .onItem().transform(entitlement -> {
                    if (entitlement == null) {
                        return RestResponse.<AuthDtos.ApiResponse<Object>>status(
                                RestResponse.Status.FORBIDDEN);
                    }
                    // Return not found - actual event loading would query events table
                    return RestResponse.<AuthDtos.ApiResponse<Object>>status(
                            RestResponse.Status.NOT_FOUND);
                });
    }
}
