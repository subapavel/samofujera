package cz.samofujera.auth.event;

import java.util.UUID;

public record PasswordResetRequestedEvent(UUID userId, String email, String token) {}
