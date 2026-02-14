package cz.samofujera.auth.event;

import java.util.UUID;

public record UserDeletedEvent(UUID userId, String originalEmail, String name) {}
