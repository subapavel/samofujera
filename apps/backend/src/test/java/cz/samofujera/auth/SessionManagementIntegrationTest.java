package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USER_SESSIONS;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class SessionManagementIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DSLContext dsl;

    private UUID registerAndGetId(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "%s", "password": "password123", "name": "Session Test"}
                    """.formatted(email)))
            .andExpect(status().isCreated())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        String idStr = body.split("\"id\":\"")[1].split("\"")[0];
        return UUID.fromString(idStr);
    }

    private UserPrincipal createPrincipal(UUID id, String email) {
        return new UserPrincipal(id, email, "Session Test", "hashed", Set.of("USER"), false, false);
    }

    private void insertSession(UUID userId, String sessionId, String device, String ip) {
        dsl.insertInto(USER_SESSIONS)
            .set(USER_SESSIONS.SESSION_ID, sessionId)
            .set(USER_SESSIONS.USER_ID, userId)
            .set(USER_SESSIONS.DEVICE_FINGERPRINT, "fp-" + sessionId)
            .set(USER_SESSIONS.DEVICE_NAME, device)
            .set(USER_SESSIONS.IP_ADDRESS, ip)
            .execute();
    }

    @Test
    void listSessions_returnsSessionsForUser() throws Exception {
        var email = "sessions-list@test.com";
        var userId = registerAndGetId(email);
        var principal = createPrincipal(userId, email);

        insertSession(userId, "sess-list-1", "Chrome on Windows", "127.0.0.1");
        insertSession(userId, "sess-list-2", "Firefox on Linux", "192.168.1.1");

        mockMvc.perform(get("/api/me/sessions").with(user(principal)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void listSessions_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/me/sessions"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void revokeSession_removesSession() throws Exception {
        var email = "sessions-revoke@test.com";
        var userId = registerAndGetId(email);
        var principal = createPrincipal(userId, email);

        insertSession(userId, "sess-revoke-1", "Chrome on Windows", "127.0.0.1");

        mockMvc.perform(delete("/api/me/sessions/sess-revoke-1").with(user(principal)))
            .andExpect(status().isNoContent());

        // Verify session is gone
        mockMvc.perform(get("/api/me/sessions").with(user(principal)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void revokeSession_returns404_forOtherUsersSession() throws Exception {
        var email1 = "sessions-owner@test.com";
        var userId1 = registerAndGetId(email1);

        var email2 = "sessions-other@test.com";
        var userId2 = registerAndGetId(email2);
        var principal2 = createPrincipal(userId2, email2);

        insertSession(userId1, "sess-other-1", "Chrome", "127.0.0.1");

        mockMvc.perform(delete("/api/me/sessions/sess-other-1").with(user(principal2)))
            .andExpect(status().isNotFound());
    }
}
