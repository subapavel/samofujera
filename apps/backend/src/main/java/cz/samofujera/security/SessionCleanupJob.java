package cz.samofujera.security;

import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class SessionCleanupJob {

    @Inject
    SessionService sessionService;

    @Scheduled(every = "${app.session.cleanup-interval:1h}")
    Uni<Void> cleanExpiredSessions() {
        Log.debug("Running expired session cleanup");
        return sessionService.deleteExpiredSessions();
    }
}
