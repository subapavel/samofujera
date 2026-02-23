package cz.samofujera.catalog;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.image.internal.ImageProcessingService;
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

import java.time.Duration;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ProductGalleryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private ImageProcessingService imageProcessingService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private void setupMocks() throws Exception {
        doNothing().when(storageService).upload(anyString(), any(byte[].class), anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/images/file.jpg");
    }

    private String createProduct(String productType) throws Exception {
        String slug = "gallery-test-" + UUID.randomUUID().toString().substring(0, 8);
        var result = mockMvc.perform(post("/api/admin/products")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "title": "Gallery Test Product",
                        "slug": "%s",
                        "productType": "%s",
                        "prices": {"CZK": 199.00}
                    }
                    """.formatted(slug, productType)))
            .andExpect(status().isCreated())
            .andReturn();
        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    private String uploadImage(String filename) throws Exception {
        var file = new MockMultipartFile("file", filename,
            "image/jpeg", "fake image content".getBytes());
        var result = mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .param("altText", "Test image " + filename)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();
        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    @Test
    void addImageToProduct_andGetImages() throws Exception {
        setupMocks();

        var productId = createProduct("EBOOK");
        var imageId = uploadImage("gallery-test-1.jpg");

        // Link image to product gallery
        mockMvc.perform(post("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"imageId": "%s"}
                    """.formatted(imageId)))
            .andExpect(status().isCreated());

        // Get images for product
        mockMvc.perform(get("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].imageId").value(imageId))
            .andExpect(jsonPath("$.data[0].url").exists())
            .andExpect(jsonPath("$.data[0].panX").value(50))
            .andExpect(jsonPath("$.data[0].panY").value(50))
            .andExpect(jsonPath("$.data[0].sortOrder").value(0));
    }

    @Test
    void productDetail_includesGalleryImages() throws Exception {
        setupMocks();

        var productId = createProduct("EBOOK");
        var imageId = uploadImage("detail-gallery.jpg");

        // Link image
        mockMvc.perform(post("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"imageId": "%s"}
                    """.formatted(imageId)))
            .andExpect(status().isCreated());

        // Get product detail — should include images array
        mockMvc.perform(get("/api/admin/products/{id}", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.images").isArray())
            .andExpect(jsonPath("$.data.images.length()").value(1))
            .andExpect(jsonPath("$.data.images[0].imageId").value(imageId));
    }

    @Test
    void reorderProductImages() throws Exception {
        setupMocks();

        var productId = createProduct("EBOOK");
        var imageId1 = uploadImage("reorder-1.jpg");
        var imageId2 = uploadImage("reorder-2.jpg");

        // Link both images
        for (var imageId : new String[]{imageId1, imageId2}) {
            mockMvc.perform(post("/api/admin/products/{productId}/images", productId)
                    .with(user(adminPrincipal()))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"imageId": "%s"}
                        """.formatted(imageId)))
                .andExpect(status().isCreated());
        }

        // Reorder: swap order (second image first)
        mockMvc.perform(put("/api/admin/products/{productId}/images/reorder", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"imageIds": ["%s", "%s"]}
                    """.formatted(imageId2, imageId1)))
            .andExpect(status().isOk());

        // Verify new order
        mockMvc.perform(get("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].imageId").value(imageId2))
            .andExpect(jsonPath("$.data[0].sortOrder").value(0))
            .andExpect(jsonPath("$.data[1].imageId").value(imageId1))
            .andExpect(jsonPath("$.data[1].sortOrder").value(1));
    }

    @Test
    void removeImageFromProduct() throws Exception {
        setupMocks();

        var productId = createProduct("EBOOK");
        var imageId = uploadImage("remove-test.jpg");

        // Link
        mockMvc.perform(post("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"imageId": "%s"}
                    """.formatted(imageId)))
            .andExpect(status().isCreated());

        // Unlink
        mockMvc.perform(delete("/api/admin/products/{productId}/images/{imageId}", productId, imageId)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Verify empty
        mockMvc.perform(get("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void virtualFilter_productsSource_findsLinkedImage() throws Exception {
        setupMocks();

        var productId = createProduct("EBOOK");
        var linkedImageId = uploadImage("linked-image.jpg");
        var unlinkedImageId = uploadImage("unlinked-image.jpg");

        // Link only one image to a product
        mockMvc.perform(post("/api/admin/products/{productId}/images", productId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"imageId": "%s"}
                    """.formatted(linkedImageId)))
            .andExpect(status().isCreated());

        // Filter by "products" source — should find the linked image
        mockMvc.perform(get("/api/admin/images")
                .param("source", "products")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.id == '%s')]".formatted(linkedImageId)).exists());

        // Filter by "unlinked" source — should find the unlinked image
        mockMvc.perform(get("/api/admin/images")
                .param("source", "unlinked")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items[?(@.id == '%s')]".formatted(unlinkedImageId)).exists());
    }
}
