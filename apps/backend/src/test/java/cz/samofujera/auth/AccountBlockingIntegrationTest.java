package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AccountBlockingIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DSLContext dsl;

    private UUID registerAndGetId(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123", "name": "Block Test"}
                    """.formatted(email)))
            .andExpect(status().isCreated())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        String idStr = body.split("\"id\":\"")[1].split("\"")[0];
        return UUID.fromString(idStr);
    }

    private UserPrincipal createAdminPrincipal() {
        return new UserPrincipal(UUID.randomUUID(), "admin@test.com", "Admin", "hashed", "ADMIN", false, false);
    }

    @Test
    void blockUser_preventsLogin() throws Exception {
        var email = "block-login@test.com";
        var userId = registerAndGetId(email);
        var admin = createAdminPrincipal();

        // Block the user
        mockMvc.perform(post("/api/admin/users/" + userId + "/block").with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("User blocked"));

        // Attempt login - should fail because account is locked
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123"}
                    """.formatted(email)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void unblockUser_allowsLoginAgain() throws Exception {
        var email = "unblock-login@test.com";
        var userId = registerAndGetId(email);
        var admin = createAdminPrincipal();

        // Block
        mockMvc.perform(post("/api/admin/users/" + userId + "/block").with(user(admin)))
            .andExpect(status().isOk());

        // Unblock
        mockMvc.perform(post("/api/admin/users/" + userId + "/unblock").with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("User unblocked"));

        // Login should work again
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123"}
                    """.formatted(email)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(email));
    }

    @Test
    void adminEndpoints_return401_forRegularUsers() throws Exception {
        var email = "nonadmin@test.com";
        var userId = registerAndGetId(email);
        var regularUser = new UserPrincipal(userId, email, "Regular", "hashed", "USER", false, false);

        mockMvc.perform(post("/api/admin/users/" + UUID.randomUUID() + "/block")
                .with(user(regularUser)))
            .andExpect(status().isForbidden());
    }

    @Test
    void deleteAccount_anonymizesDataAndPreventsLogin() throws Exception {
        var email = "gdpr-delete@test.com";
        var userId = registerAndGetId(email);
        var principal = new UserPrincipal(userId, email, "GDPR Test", "hashed", "USER", false, false);

        // Delete account
        mockMvc.perform(delete("/api/me").with(user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"password": "password123"}
                    """))
            .andExpect(status().isNoContent());

        // Verify data was anonymized
        var user = dsl.selectFrom(USERS)
            .where(USERS.ID.eq(userId))
            .fetchOne();
        assert user != null;
        assert user.getDeletedAt() != null;
        assert user.getEmail().startsWith("deleted-");
        assert user.getEmail().endsWith("@anonymized.local");
        assert user.getName().equals("Deleted user");
        assert user.getPasswordHash() == null;

        // Login should fail
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123"}
                    """.formatted(email)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void deleteAccount_rejectsWrongPassword() throws Exception {
        var email = "gdpr-wrong-pw@test.com";
        var userId = registerAndGetId(email);
        var principal = new UserPrincipal(userId, email, "GDPR Test", "hashed", "USER", false, false);

        mockMvc.perform(delete("/api/me").with(user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"password": "wrongpassword"}
                    """))
            .andExpect(status().isBadRequest());
    }
}
