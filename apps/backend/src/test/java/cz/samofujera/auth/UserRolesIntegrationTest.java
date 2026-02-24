package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static cz.samofujera.generated.jooq.Tables.USER_ROLES;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
class UserRolesIntegrationTest {

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private DSLContext dsl;

    @Test
    void loadUserByUsername_returnsAllRoles_whenUserHasMultipleRoles() {
        var userId = UUID.randomUUID();
        var email = "multirole-" + userId.toString().substring(0, 8) + "@test.com";

        dsl.insertInto(USERS)
            .set(USERS.ID, userId)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "Multi Role User")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .execute();

        dsl.insertInto(USER_ROLES)
            .set(USER_ROLES.USER_ID, userId)
            .set(USER_ROLES.ROLE, "USER")
            .execute();

        dsl.insertInto(USER_ROLES)
            .set(USER_ROLES.USER_ID, userId)
            .set(USER_ROLES.ROLE, "ADMIN")
            .execute();

        var userDetails = userDetailsService.loadUserByUsername(email);
        var principal = (UserPrincipal) userDetails;

        assertThat(principal.getRoles()).containsExactlyInAnyOrder("USER", "ADMIN");
        assertThat(principal.getAuthorities()).hasSize(2);
    }

    @Test
    void loadUserByUsername_returnsSingleRole_whenUserHasOneRole() {
        var userId = UUID.randomUUID();
        var email = "singlerole-" + userId.toString().substring(0, 8) + "@test.com";

        dsl.insertInto(USERS)
            .set(USERS.ID, userId)
            .set(USERS.EMAIL, email)
            .set(USERS.NAME, "Single Role User")
            .set(USERS.PASSWORD_HASH, "$2a$10$dummyhashfortest")
            .execute();

        dsl.insertInto(USER_ROLES)
            .set(USER_ROLES.USER_ID, userId)
            .set(USER_ROLES.ROLE, "USER")
            .execute();

        var userDetails = userDetailsService.loadUserByUsername(email);
        var principal = (UserPrincipal) userDetails;

        assertThat(principal.getRoles()).containsExactly("USER");
    }
}
