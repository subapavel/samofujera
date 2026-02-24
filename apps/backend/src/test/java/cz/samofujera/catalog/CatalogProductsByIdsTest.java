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
class CatalogProductsByIdsTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    private String createActiveProduct(String title, String slug) throws Exception {
        var createResult = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "Test description",
                        "shortDescription": "Short desc",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Activate the product
        mockMvc.perform(put("/api/admin/products/" + id)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "%s",
                        "slug": "%s",
                        "description": "Test description",
                        "shortDescription": "Short desc",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00},
                        "status": "ACTIVE"
                    }
                    """.formatted(title, slug)))
            .andExpect(status().isOk());

        return id;
    }

    @Test
    void getProducts_withIds_returnsOnlyRequestedProducts() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var id1 = createActiveProduct("Product A " + suffix, "product-a-" + suffix);
        var id2 = createActiveProduct("Product B " + suffix, "product-b-" + suffix);
        var id3 = createActiveProduct("Product C " + suffix, "product-c-" + suffix);

        // Request only id1 and id3
        mockMvc.perform(get("/api/catalog/products")
                .param("ids", id1 + "," + id3))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(2))
            .andExpect(jsonPath("$.data.items[0].id").value(id1))
            .andExpect(jsonPath("$.data.items[1].id").value(id3));
    }

    @Test
    void getProducts_withIds_preservesOrder() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        var id1 = createActiveProduct("First " + suffix, "first-" + suffix);
        var id2 = createActiveProduct("Second " + suffix, "second-" + suffix);
        var id3 = createActiveProduct("Third " + suffix, "third-" + suffix);

        // Request in reverse order
        mockMvc.perform(get("/api/catalog/products")
                .param("ids", id3 + "," + id1 + "," + id2))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(3))
            .andExpect(jsonPath("$.data.items[0].id").value(id3))
            .andExpect(jsonPath("$.data.items[1].id").value(id1))
            .andExpect(jsonPath("$.data.items[2].id").value(id2));
    }

    @Test
    void getProducts_withoutIds_returnsNormally() throws Exception {
        var suffix = UUID.randomUUID().toString().substring(0, 8);
        createActiveProduct("Normal " + suffix, "normal-" + suffix);

        // Regular listing without ids param
        mockMvc.perform(get("/api/catalog/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.limit").value(20))
            .andExpect(jsonPath("$.data.totalItems").isNumber());
    }
}
