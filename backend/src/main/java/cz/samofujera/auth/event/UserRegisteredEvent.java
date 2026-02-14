package cz.samofujera.auth.event;

import java.util.UUID;

public record UserRegisteredEvent(UUID userId, String email, String name) {}
