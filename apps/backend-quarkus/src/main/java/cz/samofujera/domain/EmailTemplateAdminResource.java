package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.EmailTemplateOverrideEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Path("/api/admin/email-templates")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class EmailTemplateAdminResource {

    private static final Set<String> KNOWN_TEMPLATES = Set.of(
            "welcome", "password-reset", "account-blocked", "account-unblocked",
            "account-deleted", "order-confirmation", "digital-delivery"
    );

    private static final Map<String, Map<String, String>> DEFAULT_SUBJECTS = Map.of(
            "welcome", Map.of("cs", "Vítejte na Samo Fujera", "sk", "Vitajte na Samo Fujera"),
            "password-reset", Map.of("cs", "Obnovení hesla", "sk", "Obnovenie hesla"),
            "account-blocked", Map.of("cs", "Váš účet byl zablokován", "sk", "Váš účet bol zablokovaný"),
            "account-unblocked", Map.of("cs", "Váš účet byl odblokován", "sk", "Váš účet bol odblokovaný"),
            "account-deleted", Map.of("cs", "Váš účet byl smazán", "sk", "Váš účet bol zmazaný"),
            "order-confirmation", Map.of("cs", "Potvrzení objednávky", "sk", "Potvrdenie objednávky"),
            "digital-delivery", Map.of("cs", "Váš digitální obsah je připraven", "sk", "Váš digitálny obsah je pripravený")
    );

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<EmailTemplateDtos.TemplateListItem>>>> listTemplates() {
        return EmailTemplateOverrideEntity.<EmailTemplateOverrideEntity>listAll()
                .onItem().transform(overrides -> {
                    var overrideKeys = overrides.stream()
                            .map(o -> o.templateKey)
                            .collect(java.util.stream.Collectors.toSet());

                    var items = KNOWN_TEMPLATES.stream()
                            .sorted()
                            .map(key -> new EmailTemplateDtos.TemplateListItem(key, overrideKeys.contains(key)))
                            .toList();

                    return RestResponse.ok(AuthDtos.ApiResponse.ok(items));
                });
    }

    @GET
    @Path("/{key}/preview")
    @Produces(MediaType.TEXT_HTML)
    public Uni<RestResponse<String>> previewTemplate(
            @PathParam("key") String key,
            @QueryParam("locale") @DefaultValue("cs") String locale) {

        if (!KNOWN_TEMPLATES.contains(key)) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_FOUND));
        }

        String subjects = DEFAULT_SUBJECTS.getOrDefault(key, Map.of()).getOrDefault(locale, key);
        String html = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>%s</title></head>
                <body style="font-family: sans-serif; padding: 20px;">
                <h1>%s</h1>
                <p>Template preview for <strong>%s</strong> (%s)</p>
                </body>
                </html>
                """.formatted(subjects, subjects, key, locale);

        return Uni.createFrom().item(RestResponse.ok(html));
    }

    @GET
    @Path("/{key}/source")
    @Produces(MediaType.TEXT_HTML)
    @WithSession
    public Uni<RestResponse<String>> getTemplateSource(
            @PathParam("key") String key,
            @QueryParam("locale") @DefaultValue("cs") String locale) {

        if (!KNOWN_TEMPLATES.contains(key)) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_FOUND));
        }

        return EmailTemplateOverrideEntity.findByKeyAndLocale(key, locale)
                .onItem().transform(override -> {
                    if (override != null && override.customBodyHtml != null) {
                        return RestResponse.ok(override.customBodyHtml);
                    }
                    return RestResponse.ok("");
                });
    }

    @GET
    @Path("/{key}/default-subject")
    public Uni<RestResponse<Map<String, String>>> getDefaultSubject(@PathParam("key") String key) {
        if (!KNOWN_TEMPLATES.contains(key)) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_FOUND));
        }
        var subjects = DEFAULT_SUBJECTS.getOrDefault(key, Map.of("cs", "", "sk", ""));
        return Uni.createFrom().item(RestResponse.ok(subjects));
    }

    @GET
    @Path("/{key}/current-override")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<EmailTemplateDtos.CurrentOverrideResponse>>> getCurrentOverride(
            @PathParam("key") String key,
            @QueryParam("locale") @DefaultValue("cs") String locale) {

        if (!KNOWN_TEMPLATES.contains(key)) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_FOUND));
        }

        return EmailTemplateOverrideEntity.findByKeyAndLocale(key, locale)
                .onItem().transform(override -> {
                    if (override == null) {
                        return RestResponse.ok(AuthDtos.ApiResponse.<EmailTemplateDtos.CurrentOverrideResponse>ok(null));
                    }
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(
                            EmailTemplateDtos.CurrentOverrideResponse.from(override)));
                });
    }

    @PUT
    @Path("/{key}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<EmailTemplateDtos.CurrentOverrideResponse>>> upsertOverride(
            @PathParam("key") String key,
            @Valid EmailTemplateDtos.UpdateOverrideRequest request) {

        if (!KNOWN_TEMPLATES.contains(key)) {
            return Uni.createFrom().item(RestResponse.status(RestResponse.Status.NOT_FOUND));
        }

        return EmailTemplateOverrideEntity.findByKeyAndLocale(key, request.locale())
                .onItem().transformToUni(existing -> {
                    if (existing != null) {
                        existing.customSubject = request.customSubject();
                        existing.customBodyHtml = request.customBodyHtml();
                        return existing.<EmailTemplateOverrideEntity>persist()
                                .onItem().transform(saved -> RestResponse.ok(
                                        AuthDtos.ApiResponse.ok(EmailTemplateDtos.CurrentOverrideResponse.from(saved))));
                    } else {
                        var entity = new EmailTemplateOverrideEntity();
                        entity.templateKey = key;
                        entity.locale = request.locale();
                        entity.customSubject = request.customSubject();
                        entity.customBodyHtml = request.customBodyHtml();
                        return entity.<EmailTemplateOverrideEntity>persist()
                                .onItem().transform(saved -> RestResponse.ok(
                                        AuthDtos.ApiResponse.ok(EmailTemplateDtos.CurrentOverrideResponse.from(saved))));
                    }
                });
    }

    @DELETE
    @Path("/{key}")
    @WithTransaction
    public Uni<RestResponse<Void>> deleteOverride(
            @PathParam("key") String key,
            @QueryParam("locale") @DefaultValue("cs") String locale) {

        return EmailTemplateOverrideEntity.deleteByKeyAndLocale(key, locale)
                .onItem().transform(count -> RestResponse.noContent());
    }

    @POST
    @Path("/{key}/test")
    public Uni<RestResponse<Void>> testTemplate(
            @PathParam("key") String key,
            @QueryParam("locale") @DefaultValue("cs") String locale) {
        // Stub - would send test email via Resend
        return Uni.createFrom().item(RestResponse.ok());
    }
}
