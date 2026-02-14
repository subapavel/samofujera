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
class LoginIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private void registerUser(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123", "name": "Login Test"}
                    """.formatted(email)));
    }

    @Test
    void login_returns200_withValidCredentials() throws Exception {
        var email = "login-ok@test.com";
        registerUser(email);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123"}
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(email))
            .andExpect(jsonPath("$.data.name").value("Login Test"))
            .andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    void login_returns401_withBadPassword() throws Exception {
        var email = "login-bad@test.com";
        registerUser(email);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "wrongpassword"}
                    """.formatted(email)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void login_returns401_withNonexistentUser() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "nonexistent@test.com", "password": "password123"}
                    """))
            .andExpect(status().isUnauthorized());
    }
}
