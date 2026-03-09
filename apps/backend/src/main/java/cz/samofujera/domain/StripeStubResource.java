package cz.samofujera.domain;

import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

/**
 * Stub for Stripe webhook endpoint.
 */
@Path("/api/stripe")
@ApplicationScoped
@PermitAll
public class StripeStubResource {

    @POST
    @Path("/webhook")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.TEXT_PLAIN)
    public Uni<RestResponse<String>> webhook(String body) {
        return Uni.createFrom().item(RestResponse.ok("OK"));
    }
}
