package cz.samofujera.auth;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    private UserPrincipal createPrincipal(Set<String> roles) {
        return new UserPrincipal(
            UUID.randomUUID(), "test@example.com", "Test User",
            "hashed", roles, false, false
        );
    }

    @Test
    void getAuthorities_returnsAllRolesWithPrefix() {
        var principal = createPrincipal(Set.of("ADMIN", "EDITOR"));

        var authorityNames = principal.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toSet());

        assertThat(authorityNames).containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_EDITOR");
    }

    @Test
    void getRoles_returnsRoleSet() {
        var roles = Set.of("USER", "ADMIN");
        var principal = createPrincipal(roles);

        assertThat(principal.getRoles()).containsExactlyInAnyOrder("USER", "ADMIN");
    }

    @Test
    void hasRole_checksCorrectly() {
        var principal = createPrincipal(Set.of("ADMIN", "USER"));

        assertThat(principal.hasRole("ADMIN")).isTrue();
        assertThat(principal.hasRole("USER")).isTrue();
        assertThat(principal.hasRole("SUPERADMIN")).isFalse();
    }
}
