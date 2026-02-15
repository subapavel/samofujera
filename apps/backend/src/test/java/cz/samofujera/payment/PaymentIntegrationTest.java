package cz.samofujera.payment;

import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.payment.internal.StripeCheckoutClient;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @MockitoBean
    private StripeCheckoutClient stripeCheckoutClient;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private UserPrincipal createTestCustomer() {
        var id = UUID.randomUUID();
        var email = "customer-" + id.toString().substring(0, 8) + "@test.com";
        dsl.insertInto(USERS)
            .set(USERS.ID, id)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "Test Customer")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .set(USERS.ROLE, "USER")
            .execute();
        return new UserPrincipal(id, email, "Test Customer", "$2a$10$dummyhashfortest", "USER", false, false);
    }

    private String createActiveProduct(String title, String slug) throws Exception {
        var admin = adminPrincipal();

        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "Test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isCreated())
            .andReturn();

        var productId = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/admin/products/" + productId)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "Test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00},
                        "status": "ACTIVE"
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isOk());

        return productId;
    }

    @Test
    void checkout_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [{"productId": "%s", "quantity": 1}]}
                    """.formatted(UUID.randomUUID())))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void checkout_createsOrderAndReturnsUrl() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Checkout Product " + suffix, "checkout-" + suffix);
        var customer = createTestCustomer();

        // Mock Stripe Session.create
        var mockSession = new Session();
        mockSession.setUrl("https://checkout.stripe.com/test-session-url");
        mockSession.setId("cs_test_123");

        when(stripeCheckoutClient.createCheckoutSession(any(SessionCreateParams.class)))
            .thenReturn(mockSession);

        mockMvc.perform(post("/api/checkout")
                .with(user(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [{"productId": "%s", "quantity": 1}]}
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.checkoutUrl").value("https://checkout.stripe.com/test-session-url"))
            .andExpect(jsonPath("$.data.orderId").isNotEmpty());
    }

    @Test
    void checkout_createsOrderWithMultipleItems() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId1 = createActiveProduct("Multi Product A " + suffix, "multi-a-" + suffix);
        var productId2 = createActiveProduct("Multi Product B " + suffix, "multi-b-" + suffix);
        var customer = createTestCustomer();

        var mockSession = new Session();
        mockSession.setUrl("https://checkout.stripe.com/test-multi-session");
        mockSession.setId("cs_test_456");

        when(stripeCheckoutClient.createCheckoutSession(any(SessionCreateParams.class)))
            .thenReturn(mockSession);

        mockMvc.perform(post("/api/checkout")
                .with(user(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [
                        {"productId": "%s", "quantity": 2},
                        {"productId": "%s", "quantity": 1}
                    ]}
                    """.formatted(productId1, productId2)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.checkoutUrl").value("https://checkout.stripe.com/test-multi-session"))
            .andExpect(jsonPath("$.data.orderId").isNotEmpty());
    }

    @Test
    void webhook_returns400_withInvalidSignature() throws Exception {
        mockMvc.perform(post("/api/stripe/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Stripe-Signature", "t=1234567890,v1=invalid_signature")
                .content("{\"type\": \"checkout.session.completed\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void webhook_returns400_withMissingSignatureHeader() throws Exception {
        mockMvc.perform(post("/api/stripe/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\": \"checkout.session.completed\"}"))
            .andExpect(status().isBadRequest());
    }
}
