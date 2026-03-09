package cz.samofujera.domain;

import cz.samofujera.domain.entity.EmailTemplateOverrideEntity;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.UUID;

public final class EmailTemplateDtos {
    private EmailTemplateDtos() {}

    public record TemplateListItem(
            String key,
            boolean hasOverride
    ) {}

    public record CurrentOverrideResponse(
            UUID id,
            String templateKey,
            String locale,
            String customSubject,
            String customBodyHtml,
            Instant updatedAt
    ) {
        public static CurrentOverrideResponse from(EmailTemplateOverrideEntity entity) {
            return new CurrentOverrideResponse(
                    entity.id, entity.templateKey, entity.locale,
                    entity.customSubject, entity.customBodyHtml, entity.updatedAt
            );
        }
    }

    public record UpdateOverrideRequest(
            @NotBlank String locale,
            String customSubject,
            String customBodyHtml
    ) {}
}
