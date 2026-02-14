package cz.samofujera.user.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Repository
public class UserRepository {

    private final DSLContext dsl;

    UserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public UserRecord findById(UUID id) {
        var r = dsl.selectFrom(USERS)
            .where(USERS.ID.eq(id).and(USERS.DELETED_AT.isNull()))
            .fetchOne();
        if (r == null) return null;
        return new UserRecord(r.getId(), r.getEmail(), r.getName(),
            r.getRole(), r.getLocale(), r.getAvatarUrl());
    }

    public void updateProfile(UUID id, String name, String avatarUrl) {
        dsl.update(USERS)
            .set(USERS.NAME, name)
            .set(USERS.AVATAR_URL, avatarUrl)
            .set(USERS.UPDATED_AT, LocalDateTime.now())
            .where(USERS.ID.eq(id))
            .execute();
    }

    public void updateLocale(UUID id, String locale) {
        dsl.update(USERS)
            .set(USERS.LOCALE, locale)
            .set(USERS.UPDATED_AT, LocalDateTime.now())
            .where(USERS.ID.eq(id))
            .execute();
    }

    public record UserRecord(UUID id, String email, String name,
                             String role, String locale, String avatarUrl) {}
}
