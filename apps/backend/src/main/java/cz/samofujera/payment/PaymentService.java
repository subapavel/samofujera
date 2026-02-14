package cz.samofujera.payment;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import cz.samofujera.order.OrderDtos;
import cz.samofujera.order.OrderService;
import cz.samofujera.payment.internal.StripeCheckoutClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final OrderService orderService;
    private final StripeCheckoutClient stripeCheckoutClient;

    @Value("${app.frontend.url:http://localhost:4321}")
    private String frontendUrl;

    PaymentService(OrderService orderService, StripeCheckoutClient stripeCheckoutClient) {
        this.orderService = orderService;
        this.stripeCheckoutClient = stripeCheckoutClient;
    }

    public PaymentDtos.CheckoutResponse createCheckout(UUID userId, String userEmail, String userName,
                                                        List<PaymentDtos.CheckoutItem> items) {
        // Convert to order checkout items
        var orderItems = items.stream()
            .map(item -> new OrderDtos.CheckoutItem(item.productId(), item.quantity()))
            .toList();

        // Create order
        var order = orderService.createOrder(userId, orderItems);
        var orderId = order.id();

        // Build Stripe Checkout Session
        var paramsBuilder = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setClientReferenceId(orderId.toString())
            .setCustomerEmail(userEmail)
            .setSuccessUrl(frontendUrl + "/pokladna/uspech?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(frontendUrl + "/pokladna/zruseno");

        // Add line items from order
        for (var orderItem : order.items()) {
            var lineItem = SessionCreateParams.LineItem.builder()
                .setQuantity((long) orderItem.quantity())
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency(order.currency().toLowerCase())
                    .setUnitAmount(orderItem.unitPrice().movePointRight(2).longValueExact())
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName(orderItem.productTitle())
                        .build())
                    .build())
                .build();
            paramsBuilder.addLineItem(lineItem);
        }

        // Add metadata for reference
        paramsBuilder.putMetadata("order_id", orderId.toString());
        paramsBuilder.putMetadata("user_name", userName != null ? userName : "");

        try {
            var session = stripeCheckoutClient.createCheckoutSession(paramsBuilder.build());
            log.info("Created Stripe Checkout Session {} for order {}", session.getId(), orderId);
            return new PaymentDtos.CheckoutResponse(session.getUrl(), orderId);
        } catch (StripeException e) {
            log.error("Failed to create Stripe Checkout Session for order {}: {}", orderId, e.getMessage());
            throw new RuntimeException("Failed to create checkout session", e);
        }
    }

    public void handleCheckoutCompleted(Session session) {
        var orderId = UUID.fromString(session.getClientReferenceId());
        var paymentIntentId = session.getPaymentIntent();

        var customerEmail = session.getCustomerDetails() != null
            ? session.getCustomerDetails().getEmail()
            : session.getCustomerEmail();

        var customerName = session.getCustomerDetails() != null
            ? session.getCustomerDetails().getName()
            : null;

        // Fall back to metadata for name if not available from customer details
        if (customerName == null && session.getMetadata() != null) {
            customerName = session.getMetadata().get("user_name");
        }

        log.info("Processing checkout.session.completed for order {}, paymentIntent {}",
            orderId, paymentIntentId);

        orderService.markAsPaid(orderId, paymentIntentId, customerEmail,
            customerName != null ? customerName : "");
    }
}
