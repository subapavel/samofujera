package cz.samofujera.media;

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

import java.time.Duration;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
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

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    @Test
    void createFolder_returns201() throws Exception {
        mockMvc.perform(post("/api/admin/media/folders")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Photos", "slug": "photos"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("Photos"))
            .andExpect(jsonPath("$.data.slug").value("photos"))
            .andExpect(jsonPath("$.data.id").exists());
    }

    @Test
    void getFolder_afterCreate_returnsList() throws Exception {
        var admin = adminPrincipal();

        mockMvc.perform(post("/api/admin/media/folders")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Videos", "slug": "videos-list-test"}
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/admin/media/folders")
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[?(@.slug == 'videos-list-test')]").exists());
    }

    @Test
    void renameFolder_returns200() throws Exception {
        var admin = adminPrincipal();

        var createResult = mockMvc.perform(post("/api/admin/media/folders")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Old Folder", "slug": "old-folder-rename"}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(put("/api/admin/media/folders/" + id)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "New Folder", "slug": "new-folder-rename"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("New Folder"))
            .andExpect(jsonPath("$.data.slug").value("new-folder-rename"));
    }

    @Test
    void deleteEmptyFolder_returns204() throws Exception {
        var admin = adminPrincipal();

        var createResult = mockMvc.perform(post("/api/admin/media/folders")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "To Delete", "slug": "folder-delete-test"}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        mockMvc.perform(delete("/api/admin/media/folders/" + id)
                .with(user(admin)))
            .andExpect(status().isNoContent());
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
    void uploadTemp_returns201() throws Exception {
        doNothing().when(storageService).upload(anyString(), any(), anyLong(), anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/temp/preview.jpg");

        var file = new MockMultipartFile("file", "test-image.jpg",
            "image/jpeg", "fake image content".getBytes());

        mockMvc.perform(multipart("/api/admin/media/upload-temp")
                .file(file)
                .with(user(adminPrincipal())))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.tempKey").exists())
            .andExpect(jsonPath("$.data.previewUrl").value("https://fake-r2.example.com/temp/preview.jpg"));
    }

    @Test
    void createItemFromTemp_returns201() throws Exception {
        doNothing().when(storageService).copy(anyString(), anyString());
        doNothing().when(storageService).delete(anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/media/item.jpg");

        mockMvc.perform(post("/api/admin/media")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tempKey": "temp/abc123.jpg", "originalFilename": "photo.jpg",
                     "mimeType": "image/jpeg", "fileSizeBytes": 12345}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").exists())
            .andExpect(jsonPath("$.data.originalFilename").value("photo.jpg"))
            .andExpect(jsonPath("$.data.mimeType").value("image/jpeg"))
            .andExpect(jsonPath("$.data.fileSizeBytes").value(12345))
            .andExpect(jsonPath("$.data.url").value("https://fake-r2.example.com/media/item.jpg"));
    }

    @Test
    void updateItem_returns200() throws Exception {
        doNothing().when(storageService).copy(anyString(), anyString());
        doNothing().when(storageService).delete(anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/media/item.jpg");

        // Create item first
        var createResult = mockMvc.perform(post("/api/admin/media")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tempKey": "temp/update-test.jpg", "originalFilename": "update-test.jpg",
                     "mimeType": "image/jpeg", "fileSizeBytes": 5000}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Update
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
        doNothing().when(storageService).copy(anyString(), anyString());
        doNothing().when(storageService).delete(anyString());
        when(storageService.generatePresignedUrl(anyString(), any(Duration.class)))
            .thenReturn("https://fake-r2.example.com/media/item.jpg");

        // Create item first
        var createResult = mockMvc.perform(post("/api/admin/media")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tempKey": "temp/delete-test.jpg", "originalFilename": "delete-test.jpg",
                     "mimeType": "image/jpeg", "fileSizeBytes": 3000}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var id = com.jayway.jsonpath.JsonPath.read(
            createResult.getResponse().getContentAsString(), "$.data.id").toString();

        // Delete
        mockMvc.perform(delete("/api/admin/media/" + id)
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());
    }
}
