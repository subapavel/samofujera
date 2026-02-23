package cz.samofujera.membership;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/membership/plans")
public class MembershipAdminController {

    private final MembershipService membershipService;

    MembershipAdminController(MembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getPlans() {
        var plans = membershipService.getPlans();
        return ResponseEntity.ok(Map.of("data", plans));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createPlan(@RequestBody MembershipDtos.CreatePlanRequest request) {
        var plan = membershipService.createPlan(request);
        return ResponseEntity.ok(Map.of("data", plan));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updatePlan(
            @PathVariable UUID id,
            @RequestBody MembershipDtos.UpdatePlanRequest request) {
        var plan = membershipService.updatePlan(id, request);
        return ResponseEntity.ok(Map.of("data", plan));
    }
}
