package cz.samofujera.email;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.event.PasswordResetRequestedEvent;
import cz.samofujera.auth.event.UserBlockedEvent;
import cz.samofujera.auth.event.UserDeletedEvent;
import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.event.UserUnblockedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@Import(TestcontainersConfig.class)
class EmailListenerIntegrationTest {

    @MockitoBean
    private Resend resend;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private Emails mockEmails;

    @BeforeEach
    void setUp() throws ResendException {
        mockEmails = mock(Emails.class);
        when(resend.emails()).thenReturn(mockEmails);
        when(mockEmails.send(any(CreateEmailOptions.class))).thenReturn(new CreateEmailResponse());
    }

    @Test
    void userRegisteredEvent_sendsWelcomeEmail() throws InterruptedException, ResendException {
        publishInTransaction(new UserRegisteredEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(mockEmails, atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void passwordResetRequestedEvent_sendsResetEmail() throws InterruptedException, ResendException {
        publishInTransaction(new PasswordResetRequestedEvent(UUID.randomUUID(), "test@example.com", "abc123"));
        Thread.sleep(2000);
        verify(mockEmails, atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userBlockedEvent_sendsBlockedEmail() throws InterruptedException, ResendException {
        publishInTransaction(new UserBlockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(mockEmails, atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userUnblockedEvent_sendsUnblockedEmail() throws InterruptedException, ResendException {
        publishInTransaction(new UserUnblockedEvent(UUID.randomUUID(), "test@example.com"));
        Thread.sleep(2000);
        verify(mockEmails, atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    @Test
    void userDeletedEvent_sendsDeletedEmail() throws InterruptedException, ResendException {
        publishInTransaction(new UserDeletedEvent(UUID.randomUUID(), "test@example.com", "Jan"));
        Thread.sleep(2000);
        verify(mockEmails, atLeastOnce()).send(any(CreateEmailOptions.class));
    }

    private void publishInTransaction(Object event) {
        transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(event));
    }
}
