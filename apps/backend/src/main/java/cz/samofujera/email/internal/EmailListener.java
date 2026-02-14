package cz.samofujera.email.internal;

import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserBlockedEvent;
import cz.samofujera.auth.event.UserDeletedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.event.UserUnblockedEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
class EmailListener {

    private final EmailService emailService;
    private final String frontendUrl;

    EmailListener(EmailService emailService,
                  @org.springframework.beans.factory.annotation.Value("${app.frontend.url:http://localhost:4321}") String frontendUrl) {
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }

    @ApplicationModuleListener
    void on(UserRegisteredEvent event) {
        emailService.send(event.email(), "Vítejte na Samo Fujera", "welcome",
            Map.of("name", event.name()));
    }

    @ApplicationModuleListener
    void on(PasswordResetRequestedEvent event) {
        emailService.send(event.email(), "Obnovení hesla", "password-reset",
            Map.of("token", event.token(),
                   "resetLink", frontendUrl + "/reset-hesla?token=" + event.token()));
    }

    @ApplicationModuleListener
    void on(UserBlockedEvent event) {
        emailService.send(event.email(), "Váš účet byl zablokován", "account-blocked", Map.of());
    }

    @ApplicationModuleListener
    void on(UserUnblockedEvent event) {
        emailService.send(event.email(), "Váš účet byl obnoven", "account-unblocked", Map.of());
    }

    @ApplicationModuleListener
    void on(UserDeletedEvent event) {
        emailService.send(event.originalEmail(), "Váš účet byl smazán", "account-deleted",
            Map.of("name", event.name()));
    }
}
