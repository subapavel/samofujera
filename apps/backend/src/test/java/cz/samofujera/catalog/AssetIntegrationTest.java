package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.catalog.internal.R2StorageService;
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
    private R2StorageService r2StorageService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
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
    void uploadFile_returns404_whenProductNotFound() throws Exception {
        var nonExistentProductId = UUID.randomUUID();
        var file = new MockMultipartFile(
            "file", "test.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/files", nonExistentProductId)
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isNotFound());
    }

    @Test
    void uploadFile_returns201_withValidProduct() throws Exception {
        String slug = "file-product-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct(slug);

        var file = new MockMultipartFile(
            "file", "guide.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/files", productId)
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.fileName").value("guide.pdf"))
            .andExpect(jsonPath("$.data.mimeType").value("application/pdf"))
            .andExpect(jsonPath("$.data.sortOrder").value(0));
    }

    @Test
    void deleteFile_returns204() throws Exception {
        String slug = "delete-file-" + UUID.randomUUID().toString().substring(0, 8);
        var productId = createProduct(slug);

        var file = new MockMultipartFile(
            "file", "to-delete.pdf", "application/pdf", "PDF content".getBytes());

        var uploadResult = mockMvc.perform(multipart("/api/admin/products/{productId}/files", productId)
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var fileId = com.jayway.jsonpath.JsonPath.read(
            uploadResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(delete("/api/admin/products/{productId}/files/{fileId}", productId, fileId)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());
    }

    @Test
    void productDetail_includesFiles() throws Exception {
        String slug = "detail-files-" + UUID.randomUUID().toString().substring(0, 8);
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

        // Upload a file
        var file = new MockMultipartFile(
            "file", "ebook.pdf", "application/pdf", "PDF content".getBytes());

        mockMvc.perform(multipart("/api/admin/products/{productId}/files", productId)
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated());

        // Get product by slug — should include files
        mockMvc.perform(get("/api/catalog/products/{slug}", slug))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.files").isArray())
            .andExpect(jsonPath("$.data.files.length()").value(1))
            .andExpect(jsonPath("$.data.files[0].fileName").value("ebook.pdf"))
            .andExpect(jsonPath("$.data.files[0].mimeType").value("application/pdf"));
    }
}
