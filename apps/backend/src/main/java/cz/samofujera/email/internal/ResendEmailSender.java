package cz.samofujera.email.internal;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!dev")
class ResendEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);

    private final Resend resend;
    private final String from;

    ResendEmailSender(Resend resend,
                      @Value("${app.mail.from:Sámo Fujera <noreply@mail.samofujera.cz>}") String from) {
        this.resend = resend;
        this.from = from;
    }

    @Override
    public void send(String to, String subject, String html) {
        try {
            var options = CreateEmailOptions.builder()
                .from(from)
                .to(to)
                .subject(subject)
                .html(html)
                .build();
            resend.emails().send(options);
        } catch (ResendException e) {
            log.error("Failed to send email via Resend to {}: {}", to, e.getMessage());
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
