package cz.samofujera.auth;

import cz.samofujera.security.entity.SessionEntity;
import cz.samofujera.security.entity.UserEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Path("/api/me")
@Authenticated
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class UserResource {

    @Inject
    SecurityIdentity identity;

    public record ProfileResponse(
            Long id, String email, String name, Set<String> roles,
            String locale, String avatarUrl
    ) {}

    public record UpdateProfileRequest(String displayName) {}

    public record UpdateLocaleRequest(String locale) {}

    public record SessionResponse(
            String id, Instant createdAt, Instant expiresAt,
            Instant lastAccessedAt, String ipAddress, String userAgent
    ) {
        public static SessionResponse from(SessionEntity s) {
            return new SessionResponse(
                    s.id, s.createdAt, s.expiresAt,
                    s.lastAccessedAt, s.ipAddress, s.userAgent
            );
        }
    }

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<ProfileResponse>>> getProfile() {
        Long userId = identity.getAttribute("user_id");

        return UserEntity.<UserEntity>findById(userId)
                .onItem().ifNotNull().transform(user ->
                        RestResponse.ok(AuthDtos.ApiResponse.ok(new ProfileResponse(
                                user.id,
                                user.email,
                                user.displayName,
                                Set.of(user.role),
                                null,
                                null
                        )))
                )
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<ProfileResponse>>> updateProfile(UpdateProfileRequest request) {
        Long userId = identity.getAttribute("user_id");

        return UserEntity.<UserEntity>findById(userId)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(user -> {
                    if (user == null) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<ProfileResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    if (request.displayName() != null) {
                        user.displayName = request.displayName();
                    }
                    user.updatedAt = Instant.now();
                    return user.<UserEntity>persist()
                            .onItem().transform(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(new ProfileResponse(
                                            saved.id, saved.email, saved.displayName,
                                            Set.of(saved.role), null, null
                                    ))));
                });
    }

    @PUT
    @Path("/locale")
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<RestResponse<Void>> updateLocale(UpdateLocaleRequest request) {
        // Stub - UserEntity doesn't have a locale field yet
        return Uni.createFrom().item(RestResponse.noContent());
    }

    @GET
    @Path("/sessions")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<SessionResponse>>>> getSessions() {
        Long userId = identity.getAttribute("user_id");

        return SessionEntity.<SessionEntity>list("user.id = ?1 AND expiresAt > ?2", userId, Instant.now())
                .onItem().transform(sessions -> {
                    var responses = sessions.stream()
                            .map(SessionResponse::from)
                            .toList();
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(responses));
                });
    }

    @DELETE
    @Path("/sessions/{sessionId}")
    @WithTransaction
    public Uni<RestResponse<Void>> revokeSession(@PathParam("sessionId") String sessionId) {
        Long userId = identity.getAttribute("user_id");

        return SessionEntity.<SessionEntity>findById(sessionId)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(session -> {
                    if (session == null || !userId.equals(session.user.id)) {
                        return Uni.createFrom().item(
                                RestResponse.<Void>status(RestResponse.Status.NOT_FOUND));
                    }
                    return session.delete()
                            .onItem().transform(v -> RestResponse.noContent());
                });
    }

    @DELETE
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<RestResponse<Void>> deleteAccount(Object body) {
        // Stub - account deletion is complex (cascade orders, entitlements, etc.)
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }
}
