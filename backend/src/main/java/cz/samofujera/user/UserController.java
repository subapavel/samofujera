package cz.samofujera.user;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.auth.AuthService;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserDtos.ProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(principal.getId())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserDtos.ProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDtos.UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(principal.getId(), request)));
    }

    @PutMapping("/locale")
    public ResponseEntity<Void> updateLocale(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDtos.UpdateLocaleRequest request) {
        userService.updateLocale(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<AuthDtos.SessionResponse>>> getSessions(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(authService.getSessions(principal.getId())));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sessionId) {
        authService.revokeSession(principal.getId(), sessionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AuthDtos.DeleteAccountRequest request,
            HttpServletRequest httpRequest) {
        authService.deleteAccount(principal.getId(), request.password(), httpRequest);
        return ResponseEntity.noContent().build();
    }
}
