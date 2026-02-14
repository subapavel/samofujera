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
class CatalogCategoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    private UserPrincipal userPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "user@test.com", "User", "hashed", "USER", false, false);
    }

    @Test
    void getCategories_returnsEmptyList_whenNoCategories() throws Exception {
        mockMvc.perform(get("/api/catalog/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void createCategory_returns201_withValidData() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "E-books", "slug": "e-books-create-test", "sortOrder": 1}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.name").value("E-books"))
            .andExpect(jsonPath("$.data.slug").value("e-books-create-test"))
            .andExpect(jsonPath("$.data.sortOrder").value(1))
            .andExpect(jsonPath("$.data.id").exists());
    }

    @Test
    void createCategory_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Test", "slug": "test-unauth", "sortOrder": 0}
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void createCategory_returns403_whenNotAdmin() throws Exception {
        mockMvc.perform(post("/api/admin/categories")
                .with(user(userPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Test", "slug": "test-user-forbidden", "sortOrder": 0}
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void updateCategory_works() throws Exception {
        var admin = adminPrincipal();

        // Create
        var createResult = mockMvc.perform(post("/api/admin/categories")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "Old Name", "slug": "update-test", "sortOrder": 0}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var body = createResult.getResponse().getContentAsString();
        var id = com.jayway.jsonpath.JsonPath.read(body, "$.data.id").toString();

        // Update
        mockMvc.perform(put("/api/admin/categories/" + id)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "New Name", "slug": "update-test-new", "sortOrder": 5}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("New Name"))
            .andExpect(jsonPath("$.data.slug").value("update-test-new"))
            .andExpect(jsonPath("$.data.sortOrder").value(5));
    }

    @Test
    void deleteCategory_works() throws Exception {
        var admin = adminPrincipal();

        // Create
        var createResult = mockMvc.perform(post("/api/admin/categories")
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name": "To Delete", "slug": "delete-test", "sortOrder": 0}
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        var body = createResult.getResponse().getContentAsString();
        var id = com.jayway.jsonpath.JsonPath.read(body, "$.data.id").toString();

        // Delete
        mockMvc.perform(delete("/api/admin/categories/" + id)
                .with(user(admin)))
            .andExpect(status().isNoContent());

        // Verify it's gone - get all categories and check the deleted one isn't there
        mockMvc.perform(get("/api/catalog/categories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.slug == 'delete-test')]").doesNotExist());
    }
}
