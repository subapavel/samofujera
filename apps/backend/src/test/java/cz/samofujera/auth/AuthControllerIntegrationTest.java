package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void register_returns201_withValidData() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "new@example.com", "password": "password123", "name": "New User"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.email").value("new@example.com"))
            .andExpect(jsonPath("$.data.name").value("New User"))
            .andExpect(jsonPath("$.data.roles").isArray())
            .andExpect(jsonPath("$.data.roles[0]").value("USER"));
    }

    @Test
    void register_returns400_withDuplicateEmail() throws Exception {
        // First registration
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "dup@example.com", "password": "password123", "name": "User"}
                    """))
            .andExpect(status().isCreated());

        // Duplicate
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "dup@example.com", "password": "password123", "name": "User"}
                    """))
            .andExpect(status().isBadRequest());
    }
}
