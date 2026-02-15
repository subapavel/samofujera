package cz.samofujera.entitlement;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.catalog.CatalogDtos;
import cz.samofujera.catalog.CatalogService;
import cz.samofujera.order.event.OrderPaidEvent;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class EntitlementIntegrationTest {

    @Autowired
    private EntitlementService entitlementService;

    @Autowired
    private CatalogService catalogService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private DSLContext dsl;

    private UUID createTestUser() {
        var id = UUID.randomUUID();
        var email = "entitlement-" + id.toString().substring(0, 8) + "@test.com";
        dsl.insertInto(USERS)
            .set(USERS.ID, id)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "Test User")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .set(USERS.ROLE, "USER")
            .execute();
        return id;
    }

    private UUID createTestProduct(String suffix) {
        var product = catalogService.createProduct(new CatalogDtos.CreateProductRequest(
            "Entitlement Product " + suffix,
            "entitlement-product-" + suffix,
            "Test product for entitlement",
            "Short desc",
            "EBOOK",
            Map.of("CZK", new BigDecimal("299.00")),
            null,
            null,
            null,
            null,
            null
        ));
        return product.id();
    }

    @Test
    void grantAccess_createsEntitlement() {
        var userId = createTestUser();
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createTestProduct(suffix);

        entitlementService.grantAccess(userId, productId, "PURCHASE", UUID.randomUUID(),
            "test@test.com", "Test Product", "EBOOK");

        assertThat(entitlementService.hasAccess(userId, productId)).isTrue();
    }

    @Test
    void hasAccess_returnsFalse_whenNoEntitlement() {
        var userId = createTestUser();
        var productId = UUID.randomUUID();

        assertThat(entitlementService.hasAccess(userId, productId)).isFalse();
    }

    @Test
    void revokeAccess_removesEntitlement() {
        var userId = createTestUser();
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createTestProduct(suffix);

        entitlementService.grantAccess(userId, productId, "PURCHASE", UUID.randomUUID(),
            "test@test.com", "Test Product", "EBOOK");
        assertThat(entitlementService.hasAccess(userId, productId)).isTrue();

        entitlementService.revokeAccess(userId, productId);
        assertThat(entitlementService.hasAccess(userId, productId)).isFalse();
    }

    @Test
    void getLibrary_returnsGrantedProducts() {
        var userId = createTestUser();
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createTestProduct(suffix);

        entitlementService.grantAccess(userId, productId, "PURCHASE", UUID.randomUUID(),
            "test@test.com", "Entitlement Product " + suffix, "EBOOK");

        var library = entitlementService.getLibrary(userId);
        assertThat(library).hasSize(1);
        assertThat(library.getFirst().productId()).isEqualTo(productId);
        assertThat(library.getFirst().productTitle()).isEqualTo("Entitlement Product " + suffix);
        assertThat(library.getFirst().productType()).isEqualTo("EBOOK");
    }

    @Test
    void orderPaidEvent_grantsEntitlements() throws InterruptedException {
        var userId = createTestUser();
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createTestProduct(suffix);
        var orderId = UUID.randomUUID();

        var event = new OrderPaidEvent(
            orderId, userId, "test@test.com", "Test User",
            new BigDecimal("299.00"), "CZK",
            List.of(new OrderPaidEvent.OrderItem(
                productId, "Entitlement Product " + suffix, "EBOOK", 1))
        );

        transactionTemplate.executeWithoutResult(status -> eventPublisher.publishEvent(event));
        Thread.sleep(2000);

        assertThat(entitlementService.hasAccess(userId, productId)).isTrue();
    }
}
