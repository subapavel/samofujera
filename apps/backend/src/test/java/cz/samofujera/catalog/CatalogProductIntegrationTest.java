package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CatalogProductIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    private String createProduct(String title, String slug, String productType) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "Test description for %s",
                        "shortDescription": "Short desc",
                        "productType": "%s",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(title, slug, title, productType)))
            .andExpect(status().isCreated())
            .andReturn();

        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    @Test
    void createAndListProduct() throws Exception {
        var admin = adminPrincipal();
        String slug = "draft-product-" + UUID.randomUUID().toString().substring(0, 8);

        // Admin creates a product (defaults to DRAFT status)
        mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Draft Product",
                        "slug": "%s",
                        "description": "A draft product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 199.00}
                    }
                    """.formatted(slug)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.title").value("Draft Product"))
            .andExpect(jsonPath("$.data.slug").value(slug))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.id").exists());

        // Public listing only shows ACTIVE products — draft should not appear
        mockMvc.perform(get("/api/catalog/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug)).doesNotExist());

        // Admin listing (no status filter) should show the draft product
        mockMvc.perform(get("/api/admin/products")
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug)).exists());
    }

    @Test
    void getProductBySlug() throws Exception {
        var admin = adminPrincipal();
        String slug = "active-product-" + UUID.randomUUID().toString().substring(0, 8);

        // Create product
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Active Product",
                        "slug": "%s",
                        "description": "An active product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 499.00, "EUR": 19.99}
                    }
                    """.formatted(slug)))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update to ACTIVE status
        mockMvc.perform(put("/api/admin/products/" + id)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Active Product",
                        "slug": "%s",
                        "description": "An active product",
                        "productType": "EBOOK",
                        "prices": {"CZK": 499.00, "EUR": 19.99},
                        "status": "ACTIVE"
                    }
                    """.formatted(slug)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        // Fetch by slug via public API
        mockMvc.perform(get("/api/catalog/products/" + slug))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("Active Product"))
            .andExpect(jsonPath("$.data.slug").value(slug))
            .andExpect(jsonPath("$.data.prices.CZK").value(499.00))
            .andExpect(jsonPath("$.data.prices.EUR").value(19.99));
    }

    @Test
    void deleteProduct_archives() throws Exception {
        var admin = adminPrincipal();
        String slug = "archive-product-" + UUID.randomUUID().toString().substring(0, 8);

        // Create product
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "To Archive",
                        "slug": "%s",
                        "productType": "EBOOK",
                        "prices": {"CZK": 100.00}
                    }
                    """.formatted(slug)))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Delete (archive)
        mockMvc.perform(delete("/api/admin/products/" + id)
                .with(user(admin)))
            .andExpect(status().isNoContent());

        // Verify status is ARCHIVED via admin listing
        mockMvc.perform(get("/api/admin/products?status=ARCHIVED")
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug)).exists());
    }

    @Test
    void searchProducts() throws Exception {
        var admin = adminPrincipal();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String slug1 = "yoga-basics-" + suffix;
        String slug2 = "meditation-guide-" + suffix;

        // Create two products with ACTIVE status
        var id1 = createProduct("Yoga Basics " + suffix, slug1, "EBOOK");
        var id2 = createProduct("Meditation Guide " + suffix, slug2, "EBOOK");

        // Set both to ACTIVE
        for (var id : new String[]{id1, id2}) {
            mockMvc.perform(put("/api/admin/products/" + id)
                    .with(user(adminPrincipal()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                            "title": "%s",
                            "slug": "%s",
                            "productType": "EBOOK",
                            "prices": {"CZK": 299.00},
                            "status": "ACTIVE"
                        }
                        """.formatted(
                            id.equals(id1) ? "Yoga Basics " + suffix : "Meditation Guide " + suffix,
                            id.equals(id1) ? slug1 : slug2)))
                .andExpect(status().isOk());
        }

        // Search for "Yoga" — should find yoga product
        mockMvc.perform(get("/api/catalog/products")
                .param("search", "Yoga Basics " + suffix))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug1)).exists())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug2)).doesNotExist());

        // Search for "Meditation" — should find meditation product
        mockMvc.perform(get("/api/catalog/products")
                .param("search", "Meditation Guide " + suffix))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug2)).exists())
            .andExpect(jsonPath("$.data.items[?(@.slug == '%s')]".formatted(slug1)).doesNotExist());
    }

    // --- Auto-draft creation tests ---

    @Test
    void createDraft_returnsNewDraftProduct() throws Exception {
        mockMvc.perform(post("/api/admin/products/draft")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"productType": "EBOOK"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.productType").value("EBOOK"))
            .andExpect(jsonPath("$.data.title").value("Nový produkt"))
            .andExpect(jsonPath("$.data.slug").exists())
            .andExpect(jsonPath("$.data.images").isArray())
            .andExpect(jsonPath("$.data.images.length()").value(0));
    }

    @Test
    void createDraft_physicalProduct() throws Exception {
        mockMvc.perform(post("/api/admin/products/draft")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"productType": "PHYSICAL"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.productType").value("PHYSICAL"))
            .andExpect(jsonPath("$.data.status").value("DRAFT"))
            .andExpect(jsonPath("$.data.variants").isArray())
            .andExpect(jsonPath("$.data.variants.length()").value(0));
    }

    // --- Variant CRUD tests ---

    @Test
    void createAndDeleteVariant() throws Exception {
        when(storageService.generatePresignedUrl(anyString(), any()))
            .thenReturn("https://example.com/presigned");

        String slug = "variant-product-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct("Variant Product", slug, "PHYSICAL");

        // Create variant
        var createResult = mockMvc.perform(post("/api/admin/products/{productId}/variants", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Velikost M",
                        "sku": "VP-M-%s",
                        "stock": 10,
                        "sortOrder": 0,
                        "prices": {"CZK": 199.00, "EUR": 7.99}
                    }
                    """.formatted(slug)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.name").value("Velikost M"))
            .andExpect(jsonPath("$.data.stock").value(10))
            .andExpect(jsonPath("$.data.prices.CZK").value(199.00))
            .andReturn();

        var variantId = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update variant
        mockMvc.perform(put("/api/admin/products/{productId}/variants/{variantId}", productId, variantId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Velikost L",
                        "sku": "VP-L-%s",
                        "stock": 20,
                        "sortOrder": 0,
                        "prices": {"CZK": 249.00}
                    }
                    """.formatted(slug)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Velikost L"))
            .andExpect(jsonPath("$.data.stock").value(20))
            .andExpect(jsonPath("$.data.prices.CZK").value(249.00));

        // Delete variant
        mockMvc.perform(delete("/api/admin/products/{productId}/variants/{variantId}", productId, variantId)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Verify product detail has no variants
        mockMvc.perform(get("/api/admin/products/{id}", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.variants").isArray())
            .andExpect(jsonPath("$.data.variants.length()").value(0));
    }
}
