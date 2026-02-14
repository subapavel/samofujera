package cz.samofujera.payment.internal;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper around Stripe's static Session.create() to enable testability.
 * This can be mocked in integration tests since Stripe uses static methods.
 */
@Component
public class StripeCheckoutClient {

    public Session createCheckoutSession(SessionCreateParams params) throws StripeException {
        return Session.create(params);
    }
}
