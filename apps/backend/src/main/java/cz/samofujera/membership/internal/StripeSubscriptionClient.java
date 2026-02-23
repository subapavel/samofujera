package cz.samofujera.membership.internal;

import com.stripe.exception.StripeException;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.param.SubscriptionCancelParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Component;

/**
 * Thin wrapper around Stripe subscription APIs to enable testability.
 */
@Component
public class StripeSubscriptionClient {

    public Session createSubscriptionCheckout(SessionCreateParams params) throws StripeException {
        return Session.create(params);
    }

    public void cancelSubscription(String stripeSubscriptionId) throws StripeException {
        var subscription = Subscription.retrieve(stripeSubscriptionId);
        subscription.cancel(SubscriptionCancelParams.builder().build());
    }
}
