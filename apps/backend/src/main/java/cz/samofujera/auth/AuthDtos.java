package cz.samofujera.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String name
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        String deviceFingerprint,
        Boolean force
    ) {
        public boolean isForce() {
            return force != null && force;
        }
    }

    public record ForgotPasswordRequest(
        @NotBlank @Email String email
    ) {}

    public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8) String newPassword
    ) {}

    public record UserResponse(
        UUID id,
        String email,
        String name,
        Set<String> roles,
        String locale
    ) {}

    public record SessionConflictResponse(
        boolean conflict,
        String existingDevice,
        String sessionId
    ) {}

    public record SessionResponse(
        String sessionId,
        String deviceName,
        String ipAddress,
        LocalDateTime lastActiveAt,
        boolean current
    ) {}

    public record DeleteAccountRequest(
        @NotBlank String password
    ) {}
}
