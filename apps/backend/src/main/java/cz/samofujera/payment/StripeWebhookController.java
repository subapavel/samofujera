package cz.samofujera.payment;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    private final PaymentService paymentService;

    StripeWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {

        if (sigHeader == null || sigHeader.isBlank()) {
            log.warn("Stripe webhook request missing Stripe-Signature header");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing signature");
        }

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid signature");
        } catch (Exception e) {
            log.error("Error parsing Stripe webhook event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid payload");
        }

        log.info("Received Stripe webhook event: {} ({})", event.getType(), event.getId());

        if ("checkout.session.completed".equals(event.getType())) {
            var session = (Session) event.getDataObjectDeserializer()
                .getObject()
                .orElse(null);

            if (session != null) {
                paymentService.handleCheckoutCompleted(session);
            } else {
                log.warn("Could not deserialize checkout session from event {}", event.getId());
            }
        } else {
            log.debug("Unhandled Stripe event type: {}", event.getType());
        }

        return ResponseEntity.ok("OK");
    }
}
