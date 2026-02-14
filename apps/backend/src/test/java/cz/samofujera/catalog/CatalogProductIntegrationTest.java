package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class CatalogProductIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
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
                        "priceAmount": 299.00,
                        "priceCurrency": "CZK"
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
                        "productType": "DIGITAL_DOWNLOAD",
                        "priceAmount": 199.00
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
                        "productType": "DIGITAL_DOWNLOAD",
                        "priceAmount": 499.00,
                        "priceCurrency": "CZK"
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
                        "productType": "DIGITAL_DOWNLOAD",
                        "priceAmount": 499.00,
                        "priceCurrency": "CZK",
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
            .andExpect(jsonPath("$.data.priceAmount").value(499.00))
            .andExpect(jsonPath("$.data.assets").isArray());
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
                        "productType": "DIGITAL_DOWNLOAD",
                        "priceAmount": 100.00
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
        var id1 = createProduct("Yoga Basics " + suffix, slug1, "DIGITAL_DOWNLOAD");
        var id2 = createProduct("Meditation Guide " + suffix, slug2, "DIGITAL_DOWNLOAD");

        // Set both to ACTIVE
        for (var id : new String[]{id1, id2}) {
            mockMvc.perform(put("/api/admin/products/" + id)
                    .with(user(adminPrincipal()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                            "title": "%s",
                            "slug": "%s",
                            "productType": "DIGITAL_DOWNLOAD",
                            "priceAmount": 299.00,
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
}
