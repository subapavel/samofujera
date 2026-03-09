package cz.samofujera.realtime;

import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import io.vertx.core.json.JsonObject;
import io.vertx.mutiny.pgclient.PgConnection;
import io.vertx.pgclient.PgConnectOptions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

@ApplicationScoped
public class PgNotificationService {

    @ConfigProperty(name = "quarkus.datasource.reactive.url")
    String reactiveUrl;

    @ConfigProperty(name = "quarkus.datasource.username")
    String username;

    @ConfigProperty(name = "quarkus.datasource.password")
    String password;

    @Inject
    io.vertx.mutiny.core.Vertx vertx;

    private final BroadcastProcessor<JsonObject> processor = BroadcastProcessor.create();

    void onStart(@Observes StartupEvent event) {
        var connectOptions = PgConnectOptions.fromUri(reactiveUrl)
                .setUser(username)
                .setPassword(password);

        PgConnection.connect(vertx, connectOptions)
                .onItem().transformToUni(conn -> {
                    conn.notificationHandler(notification -> {
                        try {
                            JsonObject payload = new JsonObject(notification.getPayload());
                            payload.put("channel", notification.getChannel());
                            processor.onNext(payload);
                        } catch (Exception e) {
                            Log.warn("Failed to parse notification payload", e);
                        }
                    });
                    return conn.query("LISTEN entity_changes").execute();
                })
                .subscribe().with(
                        v -> Log.info("LISTEN connection established for entity_changes"),
                        err -> Log.error("Failed to setup LISTEN", err)
                );
    }

    public Multi<JsonObject> stream(String channel) {
        return Multi.createFrom().publisher(processor)
                .filter(json -> channel == null || channel.equals(json.getString("channel")));
    }
}
