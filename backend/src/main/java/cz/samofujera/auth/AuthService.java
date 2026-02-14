package cz.samofujera.auth;

import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.internal.AuthUserRepository;
import cz.samofujera.auth.internal.PasswordResetTokenRepository;
import cz.samofujera.auth.internal.SessionConflictException;
import cz.samofujera.auth.internal.SessionRepository;
import cz.samofujera.auth.internal.SessionTrackingService;
import cz.samofujera.auth.internal.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.jooq.DSLContext;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Service
public class AuthService {

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final AuthenticationManager authenticationManager;
    private final SessionTrackingService sessionTrackingService;
    private final DSLContext dsl;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final SessionRepository sessionRepository;

    AuthService(AuthUserRepository userRepository,
                PasswordEncoder passwordEncoder,
                ApplicationEventPublisher eventPublisher,
                AuthenticationManager authenticationManager,
                SessionTrackingService sessionTrackingService,
                DSLContext dsl,
                PasswordResetTokenRepository passwordResetTokenRepository,
                SessionRepository sessionRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
        this.authenticationManager = authenticationManager;
        this.sessionTrackingService = sessionTrackingService;
        this.dsl = dsl;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.sessionRepository = sessionRepository;
    }

    public AuthDtos.UserResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        var hash = passwordEncoder.encode(request.password());
        var userId = userRepository.create(request.email(), hash, request.name());

        eventPublisher.publishEvent(new UserRegisteredEvent(userId, request.email(), request.name()));

        return new AuthDtos.UserResponse(userId, request.email(), request.name(), "USER", "cs");
    }

    public AuthDtos.UserResponse login(AuthDtos.LoginRequest request,
                                        HttpServletRequest httpRequest) {
        var authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        var principal = (UserPrincipal) authentication.getPrincipal();
        var trackResult = sessionTrackingService.checkAndTrack(
            principal.getId(), httpRequest, request.isForce()
        );

        if (trackResult.conflict()) {
            throw new SessionConflictException(trackResult.existingDevice(), trackResult.sessionId());
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        return new AuthDtos.UserResponse(
            principal.getId(),
            principal.getUsername(),
            principal.getName(),
            principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""),
            "cs"
        );
    }

    public void logout(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) {
            sessionRepository.delete(session.getId());
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    public void forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        var user = dsl.selectFrom(USERS)
            .where(USERS.EMAIL.eq(request.email()))
            .and(USERS.DELETED_AT.isNull())
            .fetchOne();

        // Always return success to prevent email enumeration
        if (user == null) return;

        var token = UUID.randomUUID().toString();
        passwordResetTokenRepository.create(user.getId(), token, LocalDateTime.now().plusHours(1));
        eventPublisher.publishEvent(new PasswordResetRequestedEvent(user.getId(), user.getEmail(), token));
    }

    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        var tokenInfo = passwordResetTokenRepository.findValidToken(request.token());
        if (tokenInfo == null) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        var hash = passwordEncoder.encode(request.newPassword());
        dsl.update(USERS)
            .set(USERS.PASSWORD_HASH, hash)
            .set(USERS.UPDATED_AT, LocalDateTime.now())
            .where(USERS.ID.eq(tokenInfo.userId()))
            .execute();

        passwordResetTokenRepository.markUsed(tokenInfo.tokenId());
    }
}
