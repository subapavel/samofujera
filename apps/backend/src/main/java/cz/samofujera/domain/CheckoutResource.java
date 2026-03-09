package cz.samofujera.domain;

import io.quarkus.security.Authenticated;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/checkout")
@ApplicationScoped
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class CheckoutResource {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<RestResponse<Object>> checkout(Object body) {
        // Stub - needs Stripe integration
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }
}
