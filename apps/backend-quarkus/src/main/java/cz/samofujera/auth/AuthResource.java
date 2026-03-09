package cz.samofujera.auth;

import cz.samofujera.security.PasswordService;
import cz.samofujera.security.SessionService;
import cz.samofujera.security.entity.UserEntity;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import io.vertx.core.http.CookieSameSite;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.time.Instant;

@Path("/api/auth")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    SessionService sessionService;

    @Inject
    PasswordService passwordService;

    @Inject
    SecurityIdentity identity;

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @PermitAll
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<AuthDtos.UserResponse>>> login(
            @Valid AuthDtos.LoginRequest request,
            RoutingContext context) {

        return UserEntity.findByEmail(request.email())
                .onItem().ifNotNull().transformToUni(user -> {
                    if (!passwordService.verify(request.password(), user.passwordHash)) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<AuthDtos.UserResponse>>status(
                                        RestResponse.Status.UNAUTHORIZED));
                    }
                    if (!user.isActive) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<AuthDtos.UserResponse>>status(
                                        RestResponse.Status.FORBIDDEN));
                    }
                    return sessionService.createSessionInline(user, context)
                            .onItem().transform(session -> {
                                context.response().addCookie(
                                        io.vertx.core.http.Cookie.cookie("SESSION_ID", session.id)
                                                .setHttpOnly(true)
                                                .setSecure(false)
                                                .setSameSite(CookieSameSite.LAX)
                                                .setPath("/")
                                                .setMaxAge(86400)
                                );
                                return RestResponse.ok(
                                        AuthDtos.ApiResponse.ok(AuthDtos.UserResponse.from(user)));
                            });
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.UNAUTHORIZED));
    }

    @POST
    @Path("/register")
    @Consumes(MediaType.APPLICATION_JSON)
    @PermitAll
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<AuthDtos.UserResponse>>> register(
            @Valid AuthDtos.RegisterRequest request) {

        return UserEntity.findByEmail(request.email())
                .onItem().ifNotNull().transform(existing ->
                        RestResponse.<AuthDtos.ApiResponse<AuthDtos.UserResponse>>status(
                                RestResponse.Status.CONFLICT))
                .onItem().ifNull().switchTo(() -> {
                    var user = new UserEntity();
                    user.email = request.email();
                    user.passwordHash = passwordService.hash(request.password());
                    user.displayName = request.displayName();
                    user.role = "USER";
                    user.isActive = true;
                    user.createdAt = Instant.now();
                    user.updatedAt = Instant.now();
                    return user.<UserEntity>persist()
                            .map(saved -> RestResponse.status(RestResponse.Status.CREATED,
                                    AuthDtos.ApiResponse.ok(AuthDtos.UserResponse.from(saved))));
                });
    }

    @POST
    @Path("/forgot-password")
    @Consumes(MediaType.APPLICATION_JSON)
    @PermitAll
    public Uni<RestResponse<AuthDtos.ApiResponse<String>>> forgotPassword(Object body) {
        // Stub — always returns OK to not leak whether email exists
        return Uni.createFrom().item(RestResponse.ok(
                AuthDtos.ApiResponse.ok("If the email exists, a reset link has been sent.")));
    }

    @POST
    @Path("/reset-password")
    @Consumes(MediaType.APPLICATION_JSON)
    @PermitAll
    public Uni<RestResponse<AuthDtos.ApiResponse<String>>> resetPassword(Object body) {
        return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_IMPLEMENTED));
    }

    @POST
    @Path("/logout")
    @Authenticated
    public Uni<RestResponse<Void>> logout(RoutingContext context) {
        var cookie = context.request().getCookie("SESSION_ID");
        if (cookie == null) {
            return Uni.createFrom().item(RestResponse.ok());
        }
        return sessionService.deleteSession(cookie.getValue())
                .onItem().transform(v -> {
                    context.response().removeCookie("SESSION_ID");
                    return RestResponse.ok();
                });
    }
}
