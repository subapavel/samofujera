package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import jakarta.servlet.http.Cookie;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static cz.samofujera.generated.jooq.Tables.USER_ROLES;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ImpersonationIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DSLContext dsl;

    private UUID targetUserId;
    private static final String TARGET_EMAIL = "target-impersonate@test.com";
    private static final String TARGET_NAME = "Target User";

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(
            UUID.randomUUID(), "admin-imp@test.com", "Admin",
            "$2a$10$dummyhashfortest", Set.of("ADMIN"), false, false
        );
    }

    private UserPrincipal superadminPrincipal() {
        return new UserPrincipal(
            UUID.randomUUID(), "superadmin-imp@test.com", "Superadmin",
            "$2a$10$dummyhashfortest", Set.of("SUPERADMIN"), false, false
        );
    }

    private UserPrincipal editorPrincipal() {
        return new UserPrincipal(
            UUID.randomUUID(), "editor-imp@test.com", "Editor",
            "$2a$10$dummyhashfortest", Set.of("EDITOR"), false, false
        );
    }

    private UserPrincipal regularUserPrincipal() {
        return new UserPrincipal(
            UUID.randomUUID(), "user-imp@test.com", "User",
            "$2a$10$dummyhashfortest", Set.of("USER"), false, false
        );
    }

    @BeforeEach
    void setUp() {
        var existing = dsl.selectFrom(USERS)
            .where(USERS.EMAIL.eq(TARGET_EMAIL))
            .fetchOne();
        if (existing == null) {
            targetUserId = UUID.randomUUID();
            dsl.insertInto(USERS)
                .set(USERS.ID, targetUserId)
                .set(USERS.EMAIL, TARGET_EMAIL)
                .set(USERS.NAME, TARGET_NAME)
                .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
                .execute();
            dsl.insertInto(USER_ROLES)
                .set(USER_ROLES.USER_ID, targetUserId)
                .set(USER_ROLES.ROLE, "USER")
                .execute();
        } else {
            targetUserId = existing.getId();
        }
    }

    /**
     * Starts impersonation and returns the SESSION cookie that must be passed
     * to subsequent requests to maintain the same Redis-backed session.
     */
    private Cookie startImpersonationAndGetSessionCookie(UserPrincipal admin) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/impersonate/" + targetUserId)
                .with(user(admin)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Impersonation started"))
            .andReturn();

        return result.getResponse().getCookie("SESSION");
    }

    @Test
    void startImpersonation_setsSessionFlag() throws Exception {
        Cookie sessionCookie = startImpersonationAndGetSessionCookie(adminPrincipal());

        // Verify status endpoint shows impersonation active
        mockMvc.perform(get("/api/admin/impersonate/status")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.active").value(true))
            .andExpect(jsonPath("$.data.userId").value(targetUserId.toString()))
            .andExpect(jsonPath("$.data.email").value(TARGET_EMAIL))
            .andExpect(jsonPath("$.data.name").value(TARGET_NAME));
    }

    @Test
    void stopImpersonation_clearsSessionFlag() throws Exception {
        Cookie sessionCookie = startImpersonationAndGetSessionCookie(adminPrincipal());

        // Stop impersonation
        mockMvc.perform(post("/api/admin/impersonate/stop")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Impersonation stopped"));

        // Verify status shows no impersonation
        mockMvc.perform(get("/api/admin/impersonate/status")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.active").value(false))
            .andExpect(jsonPath("$.data.userId").doesNotExist());
    }

    @Test
    void getEndpoint_returnsImpersonatedUserData() throws Exception {
        Cookie sessionCookie = startImpersonationAndGetSessionCookie(adminPrincipal());

        // GET /api/me should return impersonated user's data
        mockMvc.perform(get("/api/me")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value(TARGET_EMAIL))
            .andExpect(jsonPath("$.data.name").value(TARGET_NAME));
    }

    @Test
    void postEndpoint_returns403InImpersonationMode() throws Exception {
        Cookie sessionCookie = startImpersonationAndGetSessionCookie(adminPrincipal());

        // POST to a non-impersonation API endpoint should be blocked
        mockMvc.perform(post("/api/admin/users/" + UUID.randomUUID() + "/block")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isForbidden());
    }

    @Test
    void impersonation_forbiddenForNonAdmin() throws Exception {
        // EDITOR should not be able to impersonate
        mockMvc.perform(post("/api/admin/impersonate/" + targetUserId)
                .with(user(editorPrincipal())))
            .andExpect(status().isForbidden());

        // Regular USER cannot even access /api/admin/**
        mockMvc.perform(post("/api/admin/impersonate/" + targetUserId)
                .with(user(regularUserPrincipal())))
            .andExpect(status().isForbidden());
    }

    @Test
    void impersonation_allowedForSuperadmin() throws Exception {
        mockMvc.perform(post("/api/admin/impersonate/" + targetUserId)
                .with(user(superadminPrincipal())))
            .andExpect(status().isOk());
    }

    @Test
    void startImpersonation_returns404ForNonexistentUser() throws Exception {
        mockMvc.perform(post("/api/admin/impersonate/" + UUID.randomUUID())
                .with(user(adminPrincipal())))
            .andExpect(status().isNotFound());
    }

    @Test
    void impersonateStopEndpoint_notBlockedByFilter() throws Exception {
        Cookie sessionCookie = startImpersonationAndGetSessionCookie(adminPrincipal());

        // Stop should still work (POST but whitelisted)
        mockMvc.perform(post("/api/admin/impersonate/stop")
                .cookie(sessionCookie)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk());
    }

    @Test
    void statusWithoutImpersonation_returnsInactive() throws Exception {
        mockMvc.perform(get("/api/admin/impersonate/status")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.active").value(false));
    }
}
