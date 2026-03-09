package cz.samofujera.domain;

import io.quarkus.security.Authenticated;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/delivery")
@ApplicationScoped
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class DeliveryResource {

    @GET
    @Path("/{contentId}/download")
    public Uni<RestResponse<Object>> download(@PathParam("contentId") String contentId) {
        // Stub - needs R2 integration for presigned URL generation
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }
}
