package cz.samofujera.email.internal;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
class EmailService {

    private final JavaMailSender mailSender;

    EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    void send(String to, String subject, String templateName, Map<String, String> vars) {
        var html = loadTemplate(templateName);
        for (var entry : vars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom("noreply@samofujera.cz");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }

    private String loadTemplate(String name) {
        try (InputStream is = getClass().getResourceAsStream("/templates/email/" + name + ".html")) {
            if (is == null) throw new RuntimeException("Email template not found: " + name);
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load email template: " + name, e);
        }
    }
}
