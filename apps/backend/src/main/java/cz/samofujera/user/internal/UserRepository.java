package cz.samofujera.user.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;
import static cz.samofujera.generated.jooq.Tables.USER_ROLES;

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

        var roles = fetchRoles(r.getId());

        return new UserRecord(r.getId(), r.getEmail(), r.getName(),
            roles, r.getLocale(), r.getAvatarUrl());
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

    public UserRecord findByEmail(String email) {
        var r = dsl.selectFrom(USERS)
            .where(USERS.EMAIL.eq(email).and(USERS.DELETED_AT.isNull()))
            .fetchOne();
        if (r == null) return null;

        var roles = fetchRoles(r.getId());

        return new UserRecord(r.getId(), r.getEmail(), r.getName(),
            roles, r.getLocale(), r.getAvatarUrl());
    }

    public UUID createMinimal(String email) {
        var userId = dsl.insertInto(USERS)
            .set(USERS.EMAIL, email)
            .set(USERS.LOCALE, "cs")
            .returning(USERS.ID)
            .fetchOne()
            .getId();

        dsl.insertInto(USER_ROLES)
            .set(USER_ROLES.USER_ID, userId)
            .set(USER_ROLES.ROLE, "USER")
            .execute();

        return userId;
    }

    private Set<String> fetchRoles(UUID userId) {
        return new HashSet<>(dsl.select(USER_ROLES.ROLE)
            .from(USER_ROLES)
            .where(USER_ROLES.USER_ID.eq(userId))
            .fetchInto(String.class));
    }

    public record UserRecord(UUID id, String email, String name,
                             Set<String> roles, String locale, String avatarUrl) {}
}
