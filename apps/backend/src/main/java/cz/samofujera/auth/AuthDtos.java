package cz.samofujera.auth;

import cz.samofujera.security.entity.UserEntity;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public final class AuthDtos {
    private AuthDtos() {}

    // Generic wrapper matching Spring Boot's ApiResponse format
    public record ApiResponse<T>(T data, String message) {
        public static <T> ApiResponse<T> ok(T data) {
            return new ApiResponse<>(data, null);
        }
        public static <T> ApiResponse<T> ok(T data, String message) {
            return new ApiResponse<>(data, message);
        }
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8) String password,
            String displayName
    ) {}

    // Matches frontend's UserResponse type: {id, email, name, roles, locale}
    public record UserResponse(
            Long id,
            String email,
            String name,
            Set<String> roles,
            String locale
    ) {
        public static UserResponse from(UserEntity user) {
            return new UserResponse(user.id, user.email, user.displayName, Set.of(user.role), null);
        }
    }

    public record ErrorResponse(String message) {}
}
