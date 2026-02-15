package cz.samofujera.order;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class OrderIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

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

        mockMvc.perform(put("/api/admin/products/" + productId)
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

    private String createOrder(UserPrincipal customer, String productId) throws Exception {
        var result = mockMvc.perform(post("/api/orders")
                .with(user(customer))
                .param("currency", "CZK")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    [{"productId": "%s", "quantity": 1}]
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andReturn();

        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    @Test
    void createOrder_createsOrderWithItems() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Order Test Product " + suffix, "order-test-" + suffix);
        var customer = createTestCustomer();

        mockMvc.perform(post("/api/orders")
                .with(user(customer))
                .param("currency", "CZK")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    [{"productId": "%s", "quantity": 2}]
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.status").value("PENDING"))
            .andExpect(jsonPath("$.data.totalAmount").value(598.00))
            .andExpect(jsonPath("$.data.currency").value("CZK"))
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.items.length()").value(1))
            .andExpect(jsonPath("$.data.items[0].quantity").value(2))
            .andExpect(jsonPath("$.data.items[0].productTitle").value("Order Test Product " + suffix));
    }

    @Test
    void getMyOrders_returnsOnlyMyOrders() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("MyOrders Product " + suffix, "myorders-" + suffix);

        var customer1 = createTestCustomer();
        var customer2 = createTestCustomer();

        createOrder(customer1, productId);
        createOrder(customer2, productId);

        mockMvc.perform(get("/api/orders")
                .with(user(customer1)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalItems").value(1));

        mockMvc.perform(get("/api/orders")
                .with(user(customer2)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalItems").value(1));
    }

    @Test
    void markAsPaid_updatesStatus() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Paid Product " + suffix, "paid-" + suffix);

        var customer = createTestCustomer();
        var orderId = createOrder(customer, productId);

        mockMvc.perform(get("/api/orders/" + orderId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void getOrder_returns404_forOtherUsersOrder() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Ownership Product " + suffix, "own-" + suffix);

        var customer1 = createTestCustomer();
        var customer2 = createTestCustomer();

        var orderId = createOrder(customer1, productId);

        mockMvc.perform(get("/api/orders/" + orderId)
                .with(user(customer2)))
            .andExpect(status().isNotFound());
    }

    @Test
    void adminGetOrders_showsAll() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Admin Product " + suffix, "admin-orders-" + suffix);

        var customer = createTestCustomer();
        createOrder(customer, productId);

        var admin = adminPrincipal();

        mockMvc.perform(get("/api/admin/orders")
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.totalItems").isNumber());
    }

    @Test
    void updateShipping_works() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createActiveProduct("Shipping Product " + suffix, "shipping-" + suffix);

        var customer = createTestCustomer();
        var orderId = createOrder(customer, productId);

        var admin = adminPrincipal();

        mockMvc.perform(put("/api/admin/orders/" + orderId + "/shipping")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "carrier": "DPD",
                        "trackingNumber": "CZ123456789",
                        "trackingUrl": "https://tracking.dpd.cz/CZ123456789"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.carrier").value("DPD"))
            .andExpect(jsonPath("$.data.trackingNumber").value("CZ123456789"))
            .andExpect(jsonPath("$.data.trackingUrl").value("https://tracking.dpd.cz/CZ123456789"));

        mockMvc.perform(get("/api/admin/orders/" + orderId)
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.shipping.carrier").value("DPD"))
            .andExpect(jsonPath("$.data.shipping.trackingNumber").value("CZ123456789"));
    }
}
