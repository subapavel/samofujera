package cz.samofujera.lead;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public final class LeadDtos {
    private LeadDtos() {}

    public record LeadCaptureRequest(
        @NotBlank @Email String email
    ) {}

    public record LeadCaptureResponse(
        boolean success,
        String message
    ) {}

    public record LeadStatsResponse(
        int totalCaptures,
        int uniqueEmails
    ) {}
}
