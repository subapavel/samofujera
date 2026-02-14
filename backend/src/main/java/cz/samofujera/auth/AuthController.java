package cz.samofujera.auth;

import cz.samofujera.auth.internal.SessionConflictException;
import cz.samofujera.shared.api.ApiResponse;
import cz.samofujera.shared.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.UserResponse>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {
        var user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody AuthDtos.LoginRequest request,
            HttpServletRequest httpRequest) {
        try {
            var user = authService.login(request, httpRequest);
            return ResponseEntity.ok(ApiResponse.ok(user));
        } catch (SessionConflictException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new AuthDtos.SessionConflictResponse(true, ex.getDevice(), ex.getSessionId()));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "Unauthorized", "Invalid email or password"));
        }
    }
}
