package cz.samofujera.membership;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/membership")
public class MembershipCustomerController {

    private final MembershipService membershipService;

    MembershipCustomerController(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSubscription(HttpSession session) {
        var userId = (UUID) session.getAttribute("userId");
        var subscription = membershipService.getSubscription(userId);
        var activePlans = membershipService.getActivePlans();
        return ResponseEntity.ok(Map.of(
            "data", Map.of(
                "subscription", subscription != null ? subscription : Map.of(),
                "plans", activePlans
            )
        ));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, Object>> subscribe(
            HttpSession session,
            @RequestBody MembershipDtos.SubscribeRequest request) {
        var userId = (UUID) session.getAttribute("userId");
        var userEmail = (String) session.getAttribute("userEmail");
        var result = membershipService.subscribe(userId, userEmail, request);
        return ResponseEntity.ok(Map.of("data", result));
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelSubscription(HttpSession session) {
        var userId = (UUID) session.getAttribute("userId");
        membershipService.cancelSubscription(userId);
        return ResponseEntity.ok(Map.of("data", Map.of("success", true)));
    }
}
