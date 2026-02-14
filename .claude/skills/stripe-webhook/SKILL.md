---
name: stripe-webhook
description: "Add a new Stripe webhook handler following the event-driven pattern: verify signature, process event, publish domain event."
argument-hint: "[stripe-event-type]"
disable-model-invocation: true
---

# Add Stripe Webhook Handler

## MANDATORY: Check Context7 First
Use Context7 to verify the current Stripe Java SDK API, webhook signature
verification, and event object structure for the specific event type.

## Steps (TDD)

1. **Write the integration test first** (red)
   - Mock Stripe webhook payload for `$ARGUMENTS`
   - POST to `/api/stripe/webhook` with valid signature
   - Assert domain event is published

2. **Run the test** — verify it fails

3. **Add handler method to `StripeWebhookHandler`:**
   ```java
   // payment/internal/StripeWebhookHandler.java

   private void handle${EventType}(Event event) {
       var session = (${StripeObject}) event.getDataObjectDeserializer()
           .getObject().orElseThrow();
       // Extract relevant data
       // Publish domain event
       events.publishEvent(new ${DomainEvent}(...));
   }
   ```

4. **Register in the webhook dispatcher switch:**
   ```java
   case "$ARGUMENTS" -> handle${EventType}(event);
   ```

5. **Run the test** — verify it passes

6. **Commit**

## Webhook Security
- ALWAYS verify Stripe signature using `Webhook.constructEvent(payload, sigHeader, webhookSecret)`
- NEVER trust unverified webhook payloads
- Return 200 quickly — do heavy processing via domain events
- Idempotency: check if event was already processed (store Stripe event ID)

## Pattern
```
Stripe Webhook → StripeWebhookHandler → Domain Event → Module Event Handlers
```
The webhook handler is thin — it verifies, extracts data, and publishes a domain
event. All business logic lives in the consuming modules via event handlers.

## Common Stripe Events for This Project
- `checkout.session.completed` → OrderPaidEvent
- `customer.subscription.created` → SubscriptionActivatedEvent
- `customer.subscription.deleted` → SubscriptionCancelledEvent
- `invoice.paid` → SubscriptionRenewedEvent
- `invoice.payment_failed` → PaymentFailedEvent
