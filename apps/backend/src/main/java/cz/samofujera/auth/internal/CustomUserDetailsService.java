package cz.samofujera.auth.internal;

import cz.samofujera.auth.UserPrincipal;
import org.jooq.DSLContext;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static cz.samofujera.generated.jooq.Tables.USER_ROLES;

@Service
class CustomUserDetailsService implements UserDetailsService {

    private final DSLContext dsl;

    CustomUserDetailsService(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var record = dsl.selectFrom(USERS)
                .where(USERS.EMAIL.eq(email))
                .and(USERS.DELETED_AT.isNull())
                .fetchOne();

        if (record == null) {
            throw new UsernameNotFoundException("User not found: " + email);
        }

        var roles = new HashSet<>(dsl.select(USER_ROLES.ROLE)
                .from(USER_ROLES)
                .where(USER_ROLES.USER_ID.eq(record.getId()))
                .fetchInto(String.class));

        return new UserPrincipal(
                record.getId(),
                record.getEmail(),
                record.getName(),
                record.getPasswordHash(),
                roles,
                record.getBlockedAt() != null,
                false
        );
    }

    UserPrincipal loadUserById(UUID userId) {
        var record = dsl.selectFrom(USERS)
                .where(USERS.ID.eq(userId))
                .and(USERS.DELETED_AT.isNull())
                .fetchOne();

        if (record == null) {
            return null;
        }

        var roles = new HashSet<>(dsl.select(USER_ROLES.ROLE)
                .from(USER_ROLES)
                .where(USER_ROLES.USER_ID.eq(record.getId()))
                .fetchInto(String.class));

        return new UserPrincipal(
                record.getId(),
                record.getEmail(),
                record.getName(),
                record.getPasswordHash(),
                roles,
                record.getBlockedAt() != null,
                false
        );
    }
}
