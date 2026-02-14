package cz.samofujera.auth;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AuthService authService;

    AdminController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<ApiResponse<String>> blockUser(@PathVariable UUID id) {
        authService.blockUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "User blocked"));
    }

    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<ApiResponse<String>> unblockUser(@PathVariable UUID id) {
        authService.unblockUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "User unblocked"));
    }
}
