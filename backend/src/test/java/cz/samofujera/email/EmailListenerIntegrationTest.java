package cz.samofujera.email;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserBlockedEvent;
import cz.samofujera.auth.event.UserDeletedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.event.UserUnblockedEvent;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "management.health.mail.enabled=false")
@Import(TestcontainersConfig.class)
class EmailListenerIntegrationTest {

    @MockitoBean
    private JavaMailSender mailSender;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private MimeMessage mockMessage;

    @BeforeEach
    void setUp() {
        mockMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mockMessage);
        reset(mailSender);
        when(mailSender.createMimeMessage()).thenReturn(mockMessage);
    }

    @Test
    void userRegisteredEvent_sendsWelcomeEmail() throws InterruptedException {
        publishInTransaction(new UserRegisteredEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(mailSender, atLeastOnce()).send(any(MimeMessage.class));
    }

    @Test
    void passwordResetRequestedEvent_sendsResetEmail() throws InterruptedException {
        publishInTransaction(new PasswordResetRequestedEvent(UUID.randomUUID(), "test@example.com", "abc123"));
        Thread.sleep(2000);
        verify(mailSender, atLeastOnce()).send(any(MimeMessage.class));
    }

    @Test
    void userBlockedEvent_sendsBlockedEmail() throws InterruptedException {
        publishInTransaction(new UserBlockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(mailSender, atLeastOnce()).send(any(MimeMessage.class));
    }

    @Test
    void userUnblockedEvent_sendsUnblockedEmail() throws InterruptedException {
        publishInTransaction(new UserUnblockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(mailSender, atLeastOnce()).send(any(MimeMessage.class));
    }

    @Test
    void userDeletedEvent_sendsDeletedEmail() throws InterruptedException {
        publishInTransaction(new UserDeletedEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(mailSender, atLeastOnce()).send(any(MimeMessage.class));
    }

    private void publishInTransaction(Object event) {
        transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(event));
    }
}
