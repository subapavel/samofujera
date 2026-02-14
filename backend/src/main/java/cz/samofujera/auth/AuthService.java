package cz.samofujera.auth;

import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.internal.AuthUserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    AuthService(AuthUserRepository userRepository,
                PasswordEncoder passwordEncoder,
                ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
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
}
