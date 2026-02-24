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

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PhysicalProductFieldsTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    @Test
    void createProduct_withPhysicalFields_returnsAllFields() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);

        mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Physical Product %s",
                        "slug": "physical-product-%s",
                        "description": "A physical product with all fields",
                        "shortDescription": "Short desc",
                        "productType": "PHYSICAL",
                        "prices": {"CZK": 199.00},
                        "sku": "TEST-001",
                        "badge": "Novinka",
                        "comparePriceCzk": 299.00,
                        "comparePriceEur": 12.99,
                        "availability": "in_stock",
                        "stockLimit": 50,
                        "weightKg": 0.5,
                        "dimensionWidthCm": 10,
                        "dimensionLengthCm": 15,
                        "dimensionHeightCm": 20,
                        "unitPriceEnabled": true,
                        "ogImageUrl": "https://example.com/og.jpg",
                        "variantCategoryName": "Velikosti"
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.productType").value("PHYSICAL"))
            .andExpect(jsonPath("$.data.sku").value("TEST-001"))
            .andExpect(jsonPath("$.data.badge").value("Novinka"))
            .andExpect(jsonPath("$.data.comparePriceCzk").value(299.00))
            .andExpect(jsonPath("$.data.comparePriceEur").value(12.99))
            .andExpect(jsonPath("$.data.availability").value("in_stock"))
            .andExpect(jsonPath("$.data.stockLimit").value(50))
            .andExpect(jsonPath("$.data.weightKg").value(0.5))
            .andExpect(jsonPath("$.data.dimensionWidthCm").value(10))
            .andExpect(jsonPath("$.data.dimensionLengthCm").value(15))
            .andExpect(jsonPath("$.data.dimensionHeightCm").value(20))
            .andExpect(jsonPath("$.data.unitPriceEnabled").value(true))
            .andExpect(jsonPath("$.data.ogImageUrl").value("https://example.com/og.jpg"))
            .andExpect(jsonPath("$.data.variantCategoryName").value("Velikosti"));
    }

    @Test
    void updateProduct_setsPhysicalFields() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);

        // Create a draft product without physical fields
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Update Test %s",
                        "slug": "update-test-%s",
                        "description": "Product to update",
                        "shortDescription": "Short",
                        "productType": "PHYSICAL",
                        "prices": {"CZK": 150.00}
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update with all physical fields
        mockMvc.perform(put("/api/admin/products/" + id)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Update Test %s",
                        "slug": "update-test-%s",
                        "description": "Product to update",
                        "shortDescription": "Short",
                        "productType": "PHYSICAL",
                        "prices": {"CZK": 150.00},
                        "status": "DRAFT",
                        "sku": "UPD-001",
                        "badge": "Sleva",
                        "comparePriceCzk": 250.00,
                        "comparePriceEur": 10.50,
                        "availability": "preorder",
                        "stockLimit": 25,
                        "weightKg": 1.2,
                        "dimensionWidthCm": 30,
                        "dimensionLengthCm": 40,
                        "dimensionHeightCm": 5,
                        "unitPriceEnabled": false,
                        "ogImageUrl": "https://example.com/updated-og.jpg",
                        "variantCategoryName": "Barvy"
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isOk());

        // GET and verify all fields are persisted
        mockMvc.perform(get("/api/admin/products/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sku").value("UPD-001"))
            .andExpect(jsonPath("$.data.badge").value("Sleva"))
            .andExpect(jsonPath("$.data.comparePriceCzk").value(250.00))
            .andExpect(jsonPath("$.data.comparePriceEur").value(10.50))
            .andExpect(jsonPath("$.data.availability").value("preorder"))
            .andExpect(jsonPath("$.data.stockLimit").value(25))
            .andExpect(jsonPath("$.data.weightKg").value(1.2))
            .andExpect(jsonPath("$.data.dimensionWidthCm").value(30))
            .andExpect(jsonPath("$.data.dimensionLengthCm").value(40))
            .andExpect(jsonPath("$.data.dimensionHeightCm").value(5))
            .andExpect(jsonPath("$.data.unitPriceEnabled").value(false))
            .andExpect(jsonPath("$.data.ogImageUrl").value("https://example.com/updated-og.jpg"))
            .andExpect(jsonPath("$.data.variantCategoryName").value("Barvy"));
    }

    @Test
    void createVariant_withEnhancedFields() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);

        // Create a physical product
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Variant Host %s",
                        "slug": "variant-host-%s",
                        "description": "Product with variants",
                        "shortDescription": "Short",
                        "productType": "PHYSICAL",
                        "prices": {"CZK": 300.00}
                    }
                    """.formatted(suffix, suffix)))
            .andExpect(status().isCreated())
            .andReturn();

        var productId = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Create variant with enhanced fields
        mockMvc.perform(post("/api/admin/products/{productId}/variants", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "name": "Velikost S",
                        "sku": "VH-S-%s",
                        "stock": 15,
                        "sortOrder": 0,
                        "prices": {"CZK": 300.00},
                        "availability": "in_stock",
                        "weightKg": 0.3,
                        "hidden": false
                    }
                    """.formatted(suffix)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.name").value("Velikost S"))
            .andExpect(jsonPath("$.data.availability").value("in_stock"))
            .andExpect(jsonPath("$.data.weightKg").value(0.3))
            .andExpect(jsonPath("$.data.hidden").value(false));

        // Also verify via product detail endpoint
        mockMvc.perform(get("/api/admin/products/{id}", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.variants.length()").value(1))
            .andExpect(jsonPath("$.data.variants[0].availability").value("in_stock"))
            .andExpect(jsonPath("$.data.variants[0].weightKg").value(0.3))
            .andExpect(jsonPath("$.data.variants[0].hidden").value(false));
    }
}
