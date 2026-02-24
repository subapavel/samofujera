package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class RoleAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private UserPrincipal principalWithRole(String role) {
        return new UserPrincipal(
            UUID.randomUUID(),
            role.toLowerCase() + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com",
            role + " User",
            "$2a$10$dummyhashfortest",
            Set.of(role),
            false,
            false
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERADMIN", "ADMIN", "EDITOR", "REVIEWER"})
    void adminEndpoint_returns200_forAllowedRoles(String role) throws Exception {
        mockMvc.perform(get("/api/admin/pages").with(user(principalWithRole(role))))
            .andExpect(status().isOk());
    }

    @Test
    void adminEndpoint_returns403_forUserRole() throws Exception {
        mockMvc.perform(get("/api/admin/pages").with(user(principalWithRole("USER"))))
            .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_returns401_forUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/admin/pages"))
            .andExpect(status().isUnauthorized());
    }
}
