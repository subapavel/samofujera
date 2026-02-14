package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PASSWORD_RESET_TOKENS;

@Repository
public class PasswordResetTokenRepository {

    private final DSLContext dsl;

    PasswordResetTokenRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void create(UUID userId, String token, LocalDateTime expiresAt) {
        dsl.insertInto(PASSWORD_RESET_TOKENS)
            .set(PASSWORD_RESET_TOKENS.USER_ID, userId)
            .set(PASSWORD_RESET_TOKENS.TOKEN, token)
            .set(PASSWORD_RESET_TOKENS.EXPIRES_AT, expiresAt)
            .execute();
    }

    public TokenInfo findValidToken(String token) {
        var record = dsl.selectFrom(PASSWORD_RESET_TOKENS)
            .where(PASSWORD_RESET_TOKENS.TOKEN.eq(token))
            .and(PASSWORD_RESET_TOKENS.USED_AT.isNull())
            .and(PASSWORD_RESET_TOKENS.EXPIRES_AT.gt(LocalDateTime.now()))
            .fetchOne();

        if (record == null) return null;

        return new TokenInfo(record.getId(), record.getUserId());
    }

    public void markUsed(UUID tokenId) {
        dsl.update(PASSWORD_RESET_TOKENS)
            .set(PASSWORD_RESET_TOKENS.USED_AT, LocalDateTime.now())
            .where(PASSWORD_RESET_TOKENS.ID.eq(tokenId))
            .execute();
    }

    public record TokenInfo(UUID tokenId, UUID userId) {}
}
