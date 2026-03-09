package cz.samofujera.realtime;

import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Multi;
import io.vertx.core.json.JsonObject;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestStreamElementType;

@Path("/api/events")
@Authenticated
@ApplicationScoped
public class SseResource {

    @Inject
    PgNotificationService notificationService;

    @Inject
    SecurityIdentity identity;

    @GET
    @Path("/stream")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<JsonObject> stream(@QueryParam("channel") String channel) {
        Long userId = identity.getAttribute("user_id");

        return notificationService.stream(channel)
                .filter(event -> isAuthorizedForEvent(event, userId));
    }

    private boolean isAuthorizedForEvent(JsonObject event, Long userId) {
        // For POC: admin sees all, users see their own events
        String role = identity.getRoles().stream().findFirst().orElse("USER");
        if ("ADMIN".equals(role)) {
            return true;
        }
        // Filter to events that belong to this user
        Long eventUserId = event.getLong("user_id");
        return eventUserId == null || eventUserId.equals(userId);
    }
}
