package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Repository
public class AuthUserRepository {

    private final DSLContext dsl;

    AuthUserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public boolean existsByEmail(String email) {
        return dsl.fetchExists(
            dsl.selectFrom(USERS)
               .where(USERS.EMAIL.eq(email))
               .and(USERS.DELETED_AT.isNull())
        );
    }

    public UUID create(String email, String passwordHash, String name) {
        return dsl.insertInto(USERS)
            .set(USERS.EMAIL, email)
            .set(USERS.PASSWORD_HASH, passwordHash)
            .set(USERS.NAME, name)
            .set(USERS.ROLE, "USER")
            .set(USERS.LOCALE, "cs")
            .returning(USERS.ID)
            .fetchOne()
            .getId();
    }
}
