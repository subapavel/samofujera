package cz.samofujera.security;

import cz.samofujera.security.entity.SessionEntity;
import cz.samofujera.security.entity.UserEntity;
import io.quarkus.security.identity.IdentityProviderManager;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.security.runtime.QuarkusPrincipal;
import io.quarkus.security.runtime.QuarkusSecurityIdentity;
import io.quarkus.vertx.http.runtime.security.ChallengeData;
import io.quarkus.vertx.http.runtime.security.HttpAuthenticationMechanism;
import io.smallrye.mutiny.Uni;
import io.vertx.ext.web.RoutingContext;
import jakarta.annotation.Priority;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.inject.Inject;

import java.util.Set;

@Alternative
@Priority(1)
@ApplicationScoped
public class SessionAuthMechanism implements HttpAuthenticationMechanism {

    @Inject
    SessionService sessionService;

    @Override
    public Uni<SecurityIdentity> authenticate(
            RoutingContext context,
            IdentityProviderManager identityProviderManager) {

        var sessionCookie = context.request().getCookie("SESSION_ID");
        if (sessionCookie == null) {
            return Uni.createFrom().item(anonymous());
        }

        return sessionService.findValidSession(sessionCookie.getValue())
                .onItem().transformToUni(session -> {
                    if (session == null) {
                        context.response().removeCookie("SESSION_ID");
                        return Uni.createFrom().item(anonymous());
                    }

                    // TODO: Implement sliding expiration via scheduled batch update
                    // Fire-and-forget touch causes Hibernate Reactive session conflicts

                    if (session.impersonatedUserId != null) {
                        return buildImpersonatedIdentity(session);
                    }
                    return Uni.createFrom().item(buildIdentity(session.user));
                });
    }

    @Override
    public Uni<ChallengeData> getChallenge(RoutingContext context) {
        return Uni.createFrom().item(new ChallengeData(401, null, null));
    }

    @Override
    public Set<Class<? extends io.quarkus.security.identity.request.AuthenticationRequest>> getCredentialTypes() {
        return Set.of();
    }

    private SecurityIdentity anonymous() {
        return QuarkusSecurityIdentity.builder()
                .setAnonymous(true)
                .build();
    }

    private SecurityIdentity buildIdentity(UserEntity user) {
        return QuarkusSecurityIdentity.builder()
                .setPrincipal(new QuarkusPrincipal(user.email))
                .addRole(user.role)
                .addAttribute("user_id", user.id)
                .addAttribute("is_impersonated", false)
                .build();
    }

    private Uni<SecurityIdentity> buildImpersonatedIdentity(SessionEntity session) {
        return UserEntity.<UserEntity>findById(session.impersonatedUserId)
                .onItem().transform(impersonatedUser -> {
                    if (impersonatedUser == null) {
                        return buildIdentity(session.user);
                    }
                    return (SecurityIdentity) QuarkusSecurityIdentity.builder()
                            .setPrincipal(new QuarkusPrincipal(impersonatedUser.email))
                            .addRole(impersonatedUser.role)
                            .addAttribute("user_id", impersonatedUser.id)
                            .addAttribute("is_impersonated", true)
                            .addAttribute("original_user_id", session.user.id)
                            .addAttribute("original_user_email", session.user.email)
                            .build();
                });
    }
}
