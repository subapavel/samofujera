package cz.samofujera.image;

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
import java.util.Set;
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
class ImageIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private ImageProcessingService imageProcessingService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    private void setupStorageMocks() {
        doNothing().when(storageService).upload(anyString(), any(byte[].class), anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/images/file.jpg");
    }

    @Test
    void getItems_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.limit").value(24));
    }

    @Test
    void getItems_withSourceFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .param("source", "unlinked")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void upload_returns201() throws Exception {
        setupStorageMocks();

        var file = new MockMultipartFile("file", "test-image.jpg",
            "image/jpeg", "fake image content".getBytes());

        mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .param("altText", "A test image")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.originalFilename").value("test-image.jpg"))
            .andExpect(jsonPath("$.data.mimeType").value("image/jpeg"))
            .andExpect(jsonPath("$.data.url").exists());
    }

    @Test
    void upload_nonImage_returns201() throws Exception {
        setupStorageMocks();

        var file = new MockMultipartFile("file", "document.pdf",
            "application/pdf", "fake pdf content".getBytes());

        mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.originalFilename").value("document.pdf"))
            .andExpect(jsonPath("$.data.mimeType").value("application/pdf"));
    }

    @Test
    void updateItem_returns200() throws Exception {
        setupStorageMocks();

        // Create item first via upload
        var file = new MockMultipartFile("file", "update-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update alt text and title
        mockMvc.perform(patch("/api/admin/images/" + id)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"altText": "A beautiful sunset", "title": "Sunset photo"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.altText").value("A beautiful sunset"))
            .andExpect(jsonPath("$.data.title").value("Sunset photo"));
    }

    @Test
    void deleteItem_returns204() throws Exception {
        setupStorageMocks();
        doNothing().when(storageService).deleteByPrefix(anyString());

        // Create item first via upload
        var file = new MockMultipartFile("file", "delete-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Delete
        mockMvc.perform(delete("/api/admin/images/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());
    }

    @Test
    void upload_image_returnsUrlOnly() throws Exception {
        setupStorageMocks();

        var file = new MockMultipartFile("file", "photo.jpg",
            "image/jpeg", "fake image content".getBytes());

        mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .param("altText", "Photo")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.url").exists());
    }

    @Test
    void getItems_withProductsSourceFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .param("source", "products")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void getItems_withProductCategoriesSourceFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .param("source", "product_categories")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void getItems_withTypeFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .param("type", "image")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void getItems_withSearchFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/images")
                .param("search", "nonexistent-file")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.totalItems").value(0));
    }

    @Test
    void getItem_returns200() throws Exception {
        setupStorageMocks();

        // Create item first via upload
        var file = new MockMultipartFile("file", "get-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Get by ID
        mockMvc.perform(get("/api/admin/images/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(id))
            .andExpect(jsonPath("$.data.originalFilename").value("get-test.jpg"));
    }

    @Test
    void upload_withTitle_returns201() throws Exception {
        setupStorageMocks();

        var file = new MockMultipartFile("file", "titled-image.jpg",
            "image/jpeg", "fake image content".getBytes());

        mockMvc.perform(multipart("/api/admin/images/upload")
                .file(file)
                .param("altText", "Alt text")
                .param("title", "My Title")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.title").value("My Title"))
            .andExpect(jsonPath("$.data.altText").value("Alt text"));
    }
}
