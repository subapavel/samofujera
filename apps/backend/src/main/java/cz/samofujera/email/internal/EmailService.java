package cz.samofujera.email.internal;

import org.jooq.DSLContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static cz.samofujera.generated.jooq.Tables.EMAIL_TEMPLATE_OVERRIDES;

@Service
class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final EmailSender emailSender;
    private final DSLContext dsl;

    EmailService(EmailSender emailSender, DSLContext dsl) {
        this.emailSender = emailSender;
        this.dsl = dsl;
    }

    void send(String to, String defaultSubject, String templateKey, String locale, Map<String, String> vars) {
        var override = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(templateKey))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .fetchOne();

        var subject = (override != null && override.getCustomSubject() != null)
            ? override.getCustomSubject()
            : defaultSubject;

        var html = loadTemplate(templateKey, locale);

        if (override != null && override.getCustomBodyHtml() != null) {
            html = html.replace("</body>", override.getCustomBodyHtml() + "</body>");
        }

        for (var entry : vars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
            subject = subject.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }

        emailSender.send(to, subject, html);
    }

    String renderPreview(String templateKey, String locale, Map<String, String> sampleVars) {
        var override = dsl.selectFrom(EMAIL_TEMPLATE_OVERRIDES)
            .where(EMAIL_TEMPLATE_OVERRIDES.TEMPLATE_KEY.eq(templateKey))
            .and(EMAIL_TEMPLATE_OVERRIDES.LOCALE.eq(locale))
            .fetchOne();

        var html = loadTemplate(templateKey, locale);

        if (override != null && override.getCustomBodyHtml() != null) {
            html = html.replace("</body>", override.getCustomBodyHtml() + "</body>");
        }

        for (var entry : sampleVars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }
        return html;
    }

    private String loadTemplate(String templateKey, String locale) {
        var resourcePath = "/templates/email/" + templateKey + "." + locale + ".html";
        try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
            if (is == null) throw new RuntimeException("Email template not found: " + resourcePath);
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load email template: " + resourcePath, e);
        }
    }
}
