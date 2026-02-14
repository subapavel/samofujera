package cz.samofujera.auth;

import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.internal.AuthUserRepository;
import cz.samofujera.auth.internal.SessionConflictException;
import cz.samofujera.auth.internal.SessionTrackingService;
import cz.samofujera.auth.internal.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final AuthenticationManager authenticationManager;
    private final SessionTrackingService sessionTrackingService;

    AuthService(AuthUserRepository userRepository,
                PasswordEncoder passwordEncoder,
                ApplicationEventPublisher eventPublisher,
                AuthenticationManager authenticationManager,
                SessionTrackingService sessionTrackingService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
        this.authenticationManager = authenticationManager;
        this.sessionTrackingService = sessionTrackingService;
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
}
