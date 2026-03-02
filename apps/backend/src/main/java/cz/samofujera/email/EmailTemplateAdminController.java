package cz.samofujera.email;

import cz.samofujera.email.internal.EmailService;
import org.jooq.DSLContext;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.EMAIL_TEMPLATE_OVERRIDES;

@RestController
@RequestMapping("/api/admin/email-templates")
@PreAuthorize("hasRole('ADMIN')")
class EmailTemplateAdminController {

    record TemplateMeta(String key, String nameCzech, String defaultSubjectCs, String defaultSubjectSk) {}
    record OverrideStatus(boolean cs, boolean sk) {}
    record TemplateListItem(String key, String nameCzech, OverrideStatus overrides, OffsetDateTime updatedAt) {}
    record UpdateOverrideRequest(String locale, String customSubject, String customBodyHtml) {}

    private static final List<TemplateMeta> TEMPLATES = List.of(
        new TemplateMeta("welcome", "Uvítací email", "Vítejte na Sámo Fujera", "Vitajte na Sámo Fujera"),
        new TemplateMeta("password-reset", "Reset hesla", "Obnova hesla", "Obnova hesla"),
        new TemplateMeta("account-blocked", "Zablokování účtu", "Váš účet byl pozastaven", "Váš účet bol pozastavený"),
        new TemplateMeta("account-unblocked", "Odblokování účtu", "Váš účet byl obnoven", "Váš účet bol obnovený"),
        new TemplateMeta("account-deleted", "Smazání účtu", "Váš účet byl smazán", "Váš účet bol vymazaný"),
        new TemplateMeta("order-confirmation", "Potvrzení objednávky", "Potvrzení objednávky", "Potvrdenie objednávky"),
        new TemplateMeta("digital-delivery", "Doručení digitálního obsahu", "Váš digitální obsah je připraven", "Váš digitálny obsah je pripravený")
    );

    private static final Map<String, Map<String, String>> SAMPLE_VARS = Map.of(
        "welcome", Map.of("name", "Jan Novák"),
        "password-reset", Map.of("name", "Jan Novák", "resetLink", "https://www.samofujera.cz/reset-hesla?token=sample"),
        "account-blocked", Map.of(),
        "account-unblocked", Map.of(),
        "account-deleted", Map.of("name", "Jan Novák"),
        "order-confirmation", Map.of("name", "Jan Novák", "orderId", "ORD-001", "items", "1× Meditace pro začátečníky<br>2× Jóga doma", "totalAmount", "990.00", "currency", "CZK"),
        "digital-delivery", Map.of("name", "Jan Novák", "productTitle", "Meditace pro začátečníky", "libraryUrl", "https://www.samofujera.cz/muj-ucet/knihovna")
    );

    private final DSLContext dsl;
    private final EmailService emailService;

    EmailTemplateAdminController(DSLContext dsl, EmailService emailService) {
        this.dsl = dsl;
        this.emailService = emailService;
    }

    @GetMapping
    List<TemplateListItem> listTemplates() {
        var overrides = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES).fetch();

        return TEMPLATES.stream().map(meta -> {
            var csOverride = overrides.stream()
                .anyMatch(r -> meta.key().equals(r.getTemplateKey()) && "cs".equals(r.getLocale()));
            var skOverride = overrides.stream()
                .anyMatch(r -> meta.key().equals(r.getTemplateKey()) && "sk".equals(r.getLocale()));
            var latestUpdated = overrides.stream()
                .filter(r -> meta.key().equals(r.getTemplateKey()))
                .map(r -> r.getUpdatedAt())
                .max(OffsetDateTime::compareTo)
                .orElse(null);

            return new TemplateListItem(meta.key(), meta.nameCzech(), new OverrideStatus(csOverride, skOverride), latestUpdated);
        }).toList();
    }

    @GetMapping(value = "/{key}/preview", produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> previewTemplate(@PathVariable String key, @RequestParam(defaultValue = "cs") String locale) {
        var sampleVars = SAMPLE_VARS.getOrDefault(key, Map.of());
        var html = emailService.renderPreview(key, locale, sampleVars);
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(html);
    }

    @PutMapping("/{key}")
    ResponseEntity<Void> updateOverride(@PathVariable String key, @RequestBody UpdateOverrideRequest request) {
        dsl.insertInto(EMAIL_TEMPLATE_OVERRIDES)
            .set(EMAIL_TEMPLATE_OVERRIDES.ID, UUID.randomUUID())
            .set(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY, key)
            .set(EMAIL_TEMPLATE_OVERRIDES.LOCALE, request.locale())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_SUBJECT, request.customSubject())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_BODY_HTML, request.customBodyHtml())
            .set(EMAIL_TEMPLATE_OVERRIDES.UPDATED_AT, OffsetDateTime.now())
            .onConflict(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY, EMAIL_TEMPLATE_OVERRIDES.LOCALE)
            .doUpdate()
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_SUBJECT, request.customSubject())
            .set(EMAIL_TEMPLATE_OVERRIDES.CUSTOM_BODY_HTML, request.customBodyHtml())
            .set(EMAIL_TEMPLATE_OVERRIDES.UPDATED_AT, OffsetDateTime.now())
            .execute();
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{key}")
    ResponseEntity<Void> deleteOverride(@PathVariable String key, @RequestParam String locale) {
        dsl.deleteFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(key))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .execute();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{key}/default-subject")
    ResponseEntity<Map<String, String>> getDefaultSubjects(@PathVariable String key) {
        return TEMPLATES.stream()
            .filter(m -> m.key().equals(key))
            .findFirst()
            .map(m -> ResponseEntity.ok(Map.of("cs", m.defaultSubjectCs(), "sk", m.defaultSubjectSk())))
            .orElse(ResponseEntity.notFound().build());
    }
}
