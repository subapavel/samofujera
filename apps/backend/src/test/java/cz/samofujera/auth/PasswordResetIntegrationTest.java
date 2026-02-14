package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static cz.samofujera.generated.jooq.Tables.PASSWORD_RESET_TOKENS;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PasswordResetIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DSLContext dsl;

    @Test
    void forgotPassword_returns200_evenForUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "unknown@example.com"}
                    """))
            .andExpect(status().isOk());
    }

    @Test
    void resetPassword_changesPassword_withValidToken() throws Exception {
        // Register user
        mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com", "password": "oldpassword1", "name": "Reset Test"}
                """));

        // Request reset
        mockMvc.perform(post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com"}
                """));

        // Get token from DB
        var token = dsl.select(PASSWORD_RESET_TOKENS.TOKEN)
            .from(PASSWORD_RESET_TOKENS)
            .orderBy(PASSWORD_RESET_TOKENS.CREATED_AT.desc())
            .limit(1)
            .fetchOne(PASSWORD_RESET_TOKENS.TOKEN);

        // Reset password
        mockMvc.perform(post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"token": "%s", "newPassword": "newpassword1"}
                """.formatted(token)))
            .andExpect(status().isOk());

        // Login with new password
        mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com", "password": "newpassword1"}
                """))
            .andExpect(status().isOk());
    }
}
