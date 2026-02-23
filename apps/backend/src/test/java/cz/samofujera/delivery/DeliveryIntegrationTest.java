package cz.samofujera.delivery;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.storage.StorageService;
import cz.samofujera.entitlement.EntitlementService;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class DeliveryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DSLContext dsl;

    @Autowired
    private EntitlementService entitlementService;

    @MockitoBean
    private StorageService storageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private UserPrincipal createTestCustomer() {
        var id = UUID.randomUUID();
        var email = "delivery-" + id.toString().substring(0, 8) + "@test.com";
        dsl.insertInto(USERS)
            .set(USERS.ID, id)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "Test Customer")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .set(USERS.ROLE, "USER")
            .execute();
        return new UserPrincipal(id, email, "Test Customer", "$2a$10$dummyhashfortest", "USER", false, false);
    }

    private UUID createProductWithFile(String suffix) throws Exception {
        var admin = adminPrincipal();
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Delivery Product %s",
                        "slug": "delivery-product-%s",
                        "description": "Test product for delivery",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isCreated())
            .andReturn();

        var productIdStr = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        return UUID.fromString(productIdStr);
    }

    private UUID uploadFile(UUID productId) throws Exception {
        var file = new MockMultipartFile(
            "file", "guide.pdf", "application/pdf", "PDF content".getBytes());

        var uploadResult = mockMvc.perform(multipart("/api/admin/products/{productId}/files", productId)
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var fileIdStr = com.jayway.jsonpath.JsonPath.read(
            uploadResult.getResponse().getContentAsString(), "$.data.id").toString();

        return UUID.fromString(fileIdStr);
    }

    @Test
    void download_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/delivery/{fileId}/download", UUID.randomUUID()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void download_returns403_whenNoEntitlement() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createProductWithFile(suffix);
        var fileId = uploadFile(productId);
        var customer = createTestCustomer();

        mockMvc.perform(get("/api/delivery/{fileId}/download", fileId)
                .with(user(customer)))
            .andExpect(status().isForbidden());
    }

    @Test
    void download_returnsUrl_whenEntitled() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createProductWithFile(suffix);
        var fileId = uploadFile(productId);
        var customer = createTestCustomer();

        // Grant entitlement
        entitlementService.grantProductAccess(customer.getId(), productId, "PURCHASE", UUID.randomUUID(),
            customer.getUsername(), "Delivery Product " + suffix, "EBOOK");

        // Mock presigned URL generation
        when(storageService.generatePresignedUrl(anyString(), any()))
            .thenReturn("https://r2.example.com/presigned-url");

        mockMvc.perform(get("/api/delivery/{fileId}/download", fileId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.downloadUrl").value("https://r2.example.com/presigned-url"))
            .andExpect(jsonPath("$.data.fileName").value("guide.pdf"))
            .andExpect(jsonPath("$.data.fileSize").isNumber());
    }

    @Test
    void library_returnsEntitledProducts() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createProductWithFile(suffix);
        var customer = createTestCustomer();

        entitlementService.grantProductAccess(customer.getId(), productId, "PURCHASE", UUID.randomUUID(),
            customer.getUsername(), "Delivery Product " + suffix, "EBOOK");

        mockMvc.perform(get("/api/library")
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].productId").value(productId.toString()))
            .andExpect(jsonPath("$.data[0].productTitle").value("Delivery Product " + suffix));
    }

    @Test
    void libraryFiles_returns403_whenNotEntitled() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createProductWithFile(suffix);
        var customer = createTestCustomer();

        mockMvc.perform(get("/api/library/{productId}/files", productId)
                .with(user(customer)))
            .andExpect(status().isForbidden());
    }

    @Test
    void libraryFiles_returnsFiles_whenEntitled() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var productId = createProductWithFile(suffix);
        var fileId = uploadFile(productId);
        var customer = createTestCustomer();

        entitlementService.grantProductAccess(customer.getId(), productId, "PURCHASE", UUID.randomUUID(),
            customer.getUsername(), "Delivery Product " + suffix, "EBOOK");

        mockMvc.perform(get("/api/library/{productId}/files", productId)
                .with(user(customer)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].fileName").value("guide.pdf"));
    }
}
