package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import io.smallrye.mutiny.Uni;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/public/lead-magnet")
@ApplicationScoped
@PermitAll
@Produces(MediaType.APPLICATION_JSON)
public class LeadStubResource {

    @POST
    @Path("/{entityType}/{slug}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<RestResponse<AuthDtos.ApiResponse<Object>>> captureLead(
            @PathParam("entityType") String entityType,
            @PathParam("slug") String slug,
            Object body) {
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }
}
