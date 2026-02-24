package cz.samofujera.auth.internal;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/impersonate")
class ImpersonationController {

    private static final Logger log = LoggerFactory.getLogger(ImpersonationController.class);
    static final String SESSION_KEY = "IMPERSONATING_USER_ID";

    private final CustomUserDetailsService userDetailsService;

    ImpersonationController(CustomUserDetailsService userDetailsService) {
        this.userDetailsService = userDetailsService;
    }

    @PostMapping("/{userId}")
    ResponseEntity<ApiResponse<Void>> startImpersonation(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipal caller,
            HttpSession session) {

        requireAdminOrSuperadmin(caller);

        var targetUser = userDetailsService.loadUserById(userId);
        if (targetUser == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        session.setAttribute(SESSION_KEY, userId);
        log.info("Impersonation started: admin {} ({}) now impersonating user {} ({})",
                caller.getId(), caller.getUsername(), targetUser.getId(), targetUser.getUsername());

        return ResponseEntity.ok(ApiResponse.ok(null, "Impersonation started"));
    }

    @PostMapping("/stop")
    ResponseEntity<ApiResponse<Void>> stopImpersonation(
            @AuthenticationPrincipal UserPrincipal caller,
            HttpSession session) {

        var impersonatedId = session.getAttribute(SESSION_KEY);
        session.removeAttribute(SESSION_KEY);

        log.info("Impersonation stopped: admin {} ({}) stopped impersonating user {}",
                caller.getId(), caller.getUsername(), impersonatedId);

        return ResponseEntity.ok(ApiResponse.ok(null, "Impersonation stopped"));
    }

    @GetMapping("/status")
    ResponseEntity<ApiResponse<ImpersonationStatus>> getStatus(
            @AuthenticationPrincipal UserPrincipal caller,
            HttpSession session) {

        var impersonatedId = (UUID) session.getAttribute(SESSION_KEY);
        if (impersonatedId == null) {
            return ResponseEntity.ok(ApiResponse.ok(new ImpersonationStatus(false, null, null, null)));
        }

        var targetUser = userDetailsService.loadUserById(impersonatedId);
        if (targetUser == null) {
            // User was deleted while being impersonated — clean up
            session.removeAttribute(SESSION_KEY);
            return ResponseEntity.ok(ApiResponse.ok(new ImpersonationStatus(false, null, null, null)));
        }

        return ResponseEntity.ok(ApiResponse.ok(new ImpersonationStatus(
                true, targetUser.getId().toString(), targetUser.getUsername(), targetUser.getName())));
    }

    private void requireAdminOrSuperadmin(UserPrincipal caller) {
        if (!caller.hasRole("ADMIN") && !caller.hasRole("SUPERADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN or SUPERADMIN can impersonate");
        }
    }

    record ImpersonationStatus(boolean active, String userId, String email, String name) {}
}
