package cz.samofujera.auth.event;

import java.util.UUID;

public record UserUnblockedEvent(UUID userId, String email) {}
