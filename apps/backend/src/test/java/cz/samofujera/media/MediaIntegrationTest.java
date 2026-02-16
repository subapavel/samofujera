package cz.samofujera.media;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.media.internal.ImageVariantService;
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
import java.util.Map;
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
class MediaIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StorageService storageService;

    @MockitoBean
    private ImageVariantService imageVariantService;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private void setupStorageMocks() {
        doNothing().when(storageService).upload(anyString(), any(byte[].class), anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/media/file.jpg");
    }

    @Test
    void getItems_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/admin/media")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray())
            .andExpect(jsonPath("$.data.page").value(1))
            .andExpect(jsonPath("$.data.limit").value(24));
    }

    @Test
    void getItems_withSourceFilter_returnsOk() throws Exception {
        mockMvc.perform(get("/api/admin/media")
                .param("source", "unlinked")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    void upload_returns201() throws Exception {
        setupStorageMocks();
        when(imageVariantService.generateVariants(any(byte[].class), anyString()))
            .thenReturn(Map.of());

        var file = new MockMultipartFile("file", "test-image.jpg",
            "image/jpeg", "fake image content".getBytes());

        mockMvc.perform(multipart("/api/admin/media/upload")
                .file(file)
                .param("altText", "A test image")
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.originalFilename").value("test-image.jpg"))
            .andExpect(jsonPath("$.data.mimeType").value("image/jpeg"))
            .andExpect(jsonPath("$.data.originalUrl").exists());
    }

    @Test
    void upload_nonImage_returns201() throws Exception {
        setupStorageMocks();
        when(imageVariantService.generateVariants(any(byte[].class), anyString()))
            .thenReturn(Map.of());

        var file = new MockMultipartFile("file", "document.pdf",
            "application/pdf", "fake pdf content".getBytes());

        mockMvc.perform(multipart("/api/admin/media/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.originalFilename").value("document.pdf"))
            .andExpect(jsonPath("$.data.mimeType").value("application/pdf"))
            .andExpect(jsonPath("$.data.thumbUrl").doesNotExist());
    }

    @Test
    void updateItem_returns200() throws Exception {
        setupStorageMocks();
        when(imageVariantService.generateVariants(any(byte[].class), anyString()))
            .thenReturn(Map.of());

        // Create item first via upload
        var file = new MockMultipartFile("file", "update-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/media/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update alt text
        mockMvc.perform(patch("/api/admin/media/" + id)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"altText": "A beautiful sunset"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.altText").value("A beautiful sunset"));
    }

    @Test
    void deleteItem_returns204() throws Exception {
        setupStorageMocks();
        doNothing().when(storageService).deleteByPrefix(anyString());
        when(imageVariantService.generateVariants(any(byte[].class), anyString()))
            .thenReturn(Map.of());

        // Create item first via upload
        var file = new MockMultipartFile("file", "delete-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/media/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Delete
        mockMvc.perform(delete("/api/admin/media/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());
    }

    @Test
    void getItem_returns200() throws Exception {
        setupStorageMocks();
        when(imageVariantService.generateVariants(any(byte[].class), anyString()))
            .thenReturn(Map.of());

        // Create item first via upload
        var file = new MockMultipartFile("file", "get-test.jpg",
            "image/jpeg", "fake image content".getBytes());

        var createResult = mockMvc.perform(multipart("/api/admin/media/upload")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Get by ID
        mockMvc.perform(get("/api/admin/media/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(id))
            .andExpect(jsonPath("$.data.originalFilename").value("get-test.jpg"));
    }
}
