package cz.samofujera.security;

import io.quarkus.vertx.http.runtime.filters.Filters;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URI;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class CsrfFilter {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "DELETE", "PATCH");

    @ConfigProperty(name = "quarkus.http.cors.origins")
    List<String> allowedOrigins;

    public void init(@Observes Filters filters) {
        filters.register(this::handle, -1);
    }

    private void handle(RoutingContext ctx) {
        String method = ctx.request().method().name();
        if (!MUTATING_METHODS.contains(method)) {
            ctx.next();
            return;
        }

        String origin = ctx.request().getHeader("Origin");

        if (origin != null) {
            // Check if origin matches Host OR is in the allowed CORS origins
            String host = ctx.request().getHeader("Host");
            try {
                String originHost = URI.create(origin).getHost();
                String originAuthority = URI.create(origin).getAuthority();
                if (host != null && (host.equals(originHost) || host.equals(originAuthority))) {
                    ctx.next();
                    return;
                }
                // Check against allowed CORS origins
                if (allowedOrigins.contains(origin)) {
                    ctx.next();
                    return;
                }
            } catch (Exception e) {
                // Fall through to reject
            }
            ctx.response().setStatusCode(403).end("CSRF check failed");
            return;
        }

        // No Origin header — check Referer
        String referer = ctx.request().getHeader("Referer");
        if (referer != null) {
            String host = ctx.request().getHeader("Host");
            try {
                URI refererUri = URI.create(referer);
                String refOrigin = refererUri.getScheme() + "://" + refererUri.getAuthority();
                if (host != null && (host.equals(refererUri.getHost()) || host.equals(refererUri.getAuthority()))) {
                    ctx.next();
                    return;
                }
                if (allowedOrigins.contains(refOrigin)) {
                    ctx.next();
                    return;
                }
            } catch (Exception e) {
                // Fall through to reject
            }
            ctx.response().setStatusCode(403).end("CSRF check failed");
            return;
        }

        // No Origin, no Referer — allow (curl, server-to-server, etc.)
        ctx.next();
    }
}
