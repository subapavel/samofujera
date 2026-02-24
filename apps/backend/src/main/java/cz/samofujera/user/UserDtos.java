package cz.samofujera.user;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record ProfileResponse(
        UUID id, String email, String name, Set<String> roles,
        String locale, String avatarUrl
    ) {}

    public record UpdateProfileRequest(
        @NotBlank String name,
        String avatarUrl
    ) {}

    public record UpdateLocaleRequest(
        @NotBlank String locale
    ) {}
}
