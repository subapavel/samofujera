package cz.samofujera;

import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.order.OrderService;
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
import static org.awaitility.Awaitility.await;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end checkout flow integration test.
 *
 * Verifies the full path: product creation -> checkout -> order paid -> entitlement granted -> library access.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CheckoutFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @Autowired
    private OrderService orderService;

    @MockitoBean
    private StripeCheckoutClient stripeCheckoutClient;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private UserPrincipal createTestCustomer() {
        var id = UUID.randomUUID();
        var email = "e2e-" + id.toString().substring(0, 8) + "@test.com";
        dsl.insertInto(USERS)
            .set(USERS.ID, id)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "E2E Customer")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .set(USERS.ROLE, "USER")
            .execute();
        return new UserPrincipal(id, email, "E2E Customer", "$2a$10$dummyhashfortest", "USER", false, false);
    }

    @Test
    void fullCheckoutFlow_fromProductCreationToLibraryAccess() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var admin = adminPrincipal();
        var customer = createTestCustomer();

        // Step 1: Create category via admin API
        var categoryResult = mockMvc.perform(post("/api/admin/categories")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "E2E Category %s",
                        "slug": "e2e-category-%s",
                        "sortOrder": 0
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isCreated())
            .andReturn();

        var categoryId = com.jayway.jsonpath.JsonPath.read(
            categoryResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Step 2: Create product via admin API (DRAFT)
        var createProductResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "E2E Product %s",
                        "slug": "e2e-product-%s",
                        "description": "End-to-end test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 499.00},
                        "categoryIds": ["%s"]
                    }
                    """.formatted(suffix, suffix, categoryId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andReturn();

        var productId = com.jayway.jsonpath.JsonPath.read(
            createProductResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Step 3: Update product status to ACTIVE
        mockMvc.perform(put("/api/admin/products/" + productId)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "E2E Product %s",
                        "slug": "e2e-product-%s",
                        "description": "End-to-end test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 499.00},
                        "categoryIds": ["%s"],
                        "status": "ACTIVE"
                    }
                    """.formatted(suffix, suffix, categoryId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        // Step 4: Create checkout session (mock Stripe)
        var mockSession = new Session();
        mockSession.setUrl("https://checkout.stripe.com/e2e-test-session");
        mockSession.setId("cs_e2e_test_" + suffix);

        when(stripeCheckoutClient.createCheckoutSession(any(SessionCreateParams.class)))
            .thenReturn(mockSession);

        var checkoutResult = mockMvc.perform(post("/api/checkout")
                .with(user(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [{"productId": "%s", "quantity": 1}]}
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.checkoutUrl").value("https://checkout.stripe.com/e2e-test-session"))
            .andExpect(jsonPath("$.data.orderId").isNotEmpty())
            .andReturn();

        var orderId = com.jayway.jsonpath.JsonPath.read(
            checkoutResult.getResponse().getContentAsString(), "$.data.orderId").toString();

        // Step 5: Verify order is PENDING
        mockMvc.perform(get("/api/orders/" + orderId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.totalAmount").value(499.00))
            .andExpect(jsonPath("$.data.currency").value("CZK"))
            .andExpect(jsonPath("$.data.items.length()").value(1));

        // Step 6: Simulate payment completion by calling markAsPaid directly
        orderService.markAsPaid(
            UUID.fromString(orderId),
            "pi_e2e_test_" + suffix,
            customer.getUsername(),
            "E2E Customer"
        );

        // Step 7: Wait for async event processing (OrderPaidEvent -> EntitlementListener)
        await().atMost(5, SECONDS).untilAsserted(() -> {
            // Step 8: Verify order is PAID
            mockMvc.perform(get("/api/orders/" + orderId)
                    .with(user(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"));
        });

        // Step 9: Verify entitlement was granted via library endpoint
        await().atMost(5, SECONDS).untilAsserted(() -> {
            mockMvc.perform(get("/api/library")
                    .with(user(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].productId").value(productId))
                .andExpect(jsonPath("$.data[0].productTitle").value("E2E Product " + suffix))
                .andExpect(jsonPath("$.data[0].productType").value("EBOOK"));
        });

        // Step 10: Verify library content endpoint works (even if no files uploaded)
        mockMvc.perform(get("/api/library/{productId}/content", productId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void fullCheckoutFlow_withMultipleProducts() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var admin = adminPrincipal();
        var customer = createTestCustomer();

        // Create two products
        var productId1 = createActiveProduct(admin, "E2E Multi A " + suffix, "e2e-multi-a-" + suffix);
        var productId2 = createActiveProduct(admin, "E2E Multi B " + suffix, "e2e-multi-b-" + suffix);

        // Mock Stripe
        var mockSession = new Session();
        mockSession.setUrl("https://checkout.stripe.com/e2e-multi-session");
        mockSession.setId("cs_e2e_multi_" + suffix);

        when(stripeCheckoutClient.createCheckoutSession(any(SessionCreateParams.class)))
            .thenReturn(mockSession);

        // Checkout with both products
        var checkoutResult = mockMvc.perform(post("/api/checkout")
                .with(user(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"items": [
                        {"productId": "%s", "quantity": 1},
                        {"productId": "%s", "quantity": 1}
                    ]}
                    """.formatted(productId1, productId2)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.orderId").isNotEmpty())
            .andReturn();

        var orderId = com.jayway.jsonpath.JsonPath.read(
            checkoutResult.getResponse().getContentAsString(), "$.data.orderId").toString();

        // Verify order has both items
        mockMvc.perform(get("/api/orders/" + orderId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.items.length()").value(2));

        // Mark as paid
        orderService.markAsPaid(
            UUID.fromString(orderId),
            "pi_e2e_multi_" + suffix,
            customer.getUsername(),
            "E2E Customer"
        );

        // Verify both entitlements granted
        await().atMost(5, SECONDS).untilAsserted(() -> {
            mockMvc.perform(get("/api/library")
                    .with(user(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
        });
    }

    private String createActiveProduct(UserPrincipal admin, String title, String slug) throws Exception {
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "E2E test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isCreated())
            .andReturn();

        var productId = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(put("/api/admin/products/" + productId)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "E2E test product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00},
                        "status": "ACTIVE"
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isOk());

        return productId;
    }
}
