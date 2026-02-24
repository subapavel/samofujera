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
import org.springframework.mock.web.MockMultipartFile;
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
class AssetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    private String createProduct(String slug) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Test Product %s",
                        "slug": "%s",
                        "description": "Test description",
                        "shortDescription": "Short desc",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00}
                    }
                    """.formatted(slug, slug)))
            .andExpect(status().isCreated())
            .andReturn();

        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    @Test
    void uploadContent_returns404_whenProductNotFound() throws Exception {
        var nonExistentProductId = UUID.randomUUID();
        var file = new MockMultipartFile(
            "file", "test.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/content/upload", nonExistentProductId)
                .file(file)
                .param("title", "Test PDF")
                .with(user(adminPrincipal())))
            .andExpect(status().isNotFound());
    }

    @Test
    void uploadContent_returns201_withValidProduct() throws Exception {
        String slug = "content-product-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct(slug);

        var file = new MockMultipartFile(
            "file", "guide.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/content/upload", productId)
                .file(file)
                .param("title", "Guide PDF")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.title").value("Guide PDF"))
            .andExpect(jsonPath("$.data.contentType").value("FILE"));
    }

    @Test
    void deleteContent_returns204() throws Exception {
        String slug = "delete-content-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct(slug);

        var file = new MockMultipartFile(
            "file", "to-delete.pdf", "application/pdf", "PDF content".getBytes());

        var uploadResult = mockMvc.perform(multipart("/api/admin/products/{productId}/content/upload", productId)
                .file(file)
                .param("title", "Delete Me")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var contentId = com.jayway.jsonpath.JsonPath.read(
            uploadResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(delete("/api/admin/products/{productId}/content/{contentId}", productId, contentId)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());
    }

    @Test
    void productDetail_includesContent() throws Exception {
        String slug = "detail-content-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct(slug);

        // Activate the product
        mockMvc.perform(put("/api/admin/products/{id}", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Test Product %s",
                        "slug": "%s",
                        "productType": "EBOOK",
                        "prices": {"CZK": 299.00},
                        "status": "ACTIVE"
                    }
                    """.formatted(slug, slug)))
            .andExpect(status().isOk());

        // Upload content
        var file = new MockMultipartFile(
            "file", "ebook.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/content/upload", productId)
                .file(file)
                .param("title", "Ebook PDF")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated());

        // Get product by slug — should include content
        mockMvc.perform(get("/api/catalog/products/{slug}", slug))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content").isArray())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].title").value("Ebook PDF"))
            .andExpect(jsonPath("$.data.content[0].contentType").value("FILE"));
    }
}
