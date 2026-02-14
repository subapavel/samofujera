package cz.samofujera.auth.event;

import java.util.UUID;

public record UserBlockedEvent(UUID userId, String email) {}
