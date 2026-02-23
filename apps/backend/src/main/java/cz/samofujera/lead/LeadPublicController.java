package cz.samofujera.lead;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/lead-magnet")
public class LeadPublicController {

    private final LeadService leadService;

    LeadPublicController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping("/{entityType}/{slug}")
    public ResponseEntity<ApiResponse<LeadDtos.LeadCaptureResponse>> captureLead(
            @PathVariable String entityType,
            @PathVariable String slug,
            @Valid @RequestBody LeadDtos.LeadCaptureRequest request,
            @RequestParam(required = false) String utm_source,
            @RequestParam(required = false) String utm_medium,
            @RequestParam(required = false) String utm_campaign,
            @RequestParam(required = false) String utm_content,
            HttpServletRequest httpRequest) {

        var ipAddress = extractIpAddress(httpRequest);
        var referrerUrl = httpRequest.getHeader("Referer");

        var response = leadService.captureLead(
            entityType.toUpperCase(), slug, request.email(),
            utm_source, utm_medium, utm_campaign, utm_content,
            referrerUrl, ipAddress
        );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private String extractIpAddress(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        var realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
