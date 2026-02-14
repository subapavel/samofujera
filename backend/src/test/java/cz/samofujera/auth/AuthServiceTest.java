package cz.samofujera.auth;

import cz.samofujera.auth.internal.AuthUserRepository;
import cz.samofujera.auth.internal.PasswordResetTokenRepository;
import cz.samofujera.auth.internal.SessionRepository;
import cz.samofujera.auth.internal.SessionTrackingService;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import cz.samofujera.auth.event.UserRegisteredEvent;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private AuthUserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private SessionTrackingService sessionTrackingService;
    @Mock private DSLContext dsl;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private SessionRepository sessionRepository;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, eventPublisher,
            authenticationManager, sessionTrackingService, dsl, passwordResetTokenRepository,
            sessionRepository);
    }

    @Test
    void register_createsUser_andPublishesEvent() {
        var request = new AuthDtos.RegisterRequest("test@example.com", "password123", "Test User");
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.create("test@example.com", "hashed", "Test User"))
            .thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000001"));

        var result = authService.register(request);

        assertThat(result.email()).isEqualTo("test@example.com");
        verify(eventPublisher).publishEvent(any(UserRegisteredEvent.class));
    }

    @Test
    void register_throwsException_whenEmailExists() {
        var request = new AuthDtos.RegisterRequest("exists@example.com", "password123", "Test");
        when(userRepository.existsByEmail("exists@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email");
    }
}
