package cz.samofujera.user;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class UserControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;

    private UUID registerAndGetId(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "%s", "password": "password123", "name": "Test User"}
                """.formatted(email)))
            .andExpect(status().isCreated())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        // Extract id from JSON response: {"data":{"id":"...","email":...},...}
        String idStr = body.split("\"id\":\"")[1].split("\"")[0];
        return UUID.fromString(idStr);
    }

    private UserPrincipal createPrincipal(UUID id, String email) {
        return new UserPrincipal(id, email, "Test User", "hashed", "USER", false, false);
    }

    @Test
    void getProfile_returns200_whenAuthenticated() throws Exception {
        UUID userId = registerAndGetId("profile@test.com");
        var principal = createPrincipal(userId, "profile@test.com");

        mockMvc.perform(get("/api/me").with(user(principal)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("profile@test.com"))
            .andExpect(jsonPath("$.data.name").value("Test User"));
    }

    @Test
    void getProfile_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfile_updatesName() throws Exception {
        UUID userId = registerAndGetId("update@test.com");
        var principal = createPrincipal(userId, "update@test.com");

        mockMvc.perform(put("/api/me").with(user(principal))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Updated Name"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Updated Name"));
    }

    @Test
    void updateLocale_returns204() throws Exception {
        UUID userId = registerAndGetId("locale@test.com");
        var principal = createPrincipal(userId, "locale@test.com");

        mockMvc.perform(put("/api/me/locale").with(user(principal))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"locale": "sk"}
                """))
            .andExpect(status().isNoContent());

        // Verify locale was updated
        mockMvc.perform(get("/api/me").with(user(principal)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.locale").value("sk"));
    }
}
