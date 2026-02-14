package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import static cz.samofujera.generated.jooq.Tables.USERS;

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

        return new UserPrincipal(
                record.getId(),
                record.getEmail(),
                record.getName(),
                record.getPasswordHash(),
                record.getRole(),
                record.getBlockedAt() != null,
                false
        );
    }
}
