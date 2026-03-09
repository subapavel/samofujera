package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

/**
 * Remaining admin stubs that don't have dedicated resource implementations yet.
 */
@Path("/api/admin")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class AdminStubResource {

    @POST
    @Path("/users/{id}/block")
    public Uni<RestResponse<AuthDtos.ApiResponse<String>>> blockUser(@PathParam("id") Long id) {
        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok("User blocked (stub)")));
    }

    @POST
    @Path("/users/{id}/unblock")
    public Uni<RestResponse<AuthDtos.ApiResponse<String>>> unblockUser(@PathParam("id") Long id) {
        return Uni.createFrom().item(RestResponse.ok(AuthDtos.ApiResponse.ok("User unblocked (stub)")));
    }
}
