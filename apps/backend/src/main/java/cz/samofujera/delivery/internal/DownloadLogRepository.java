package cz.samofujera.delivery.internal;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.table;

@Repository
public class DownloadLogRepository {

    private static final org.jooq.Table<Record> DOWNLOAD_LOGS = table("download_logs");
    private static final org.jooq.Field<UUID> USER_ID = field("user_id", UUID.class);
    private static final org.jooq.Field<UUID> CONTENT_ID = field("content_id", UUID.class);
    private static final org.jooq.Field<String> IP_ADDRESS = field("ip_address", String.class);
    private static final org.jooq.Field<String> USER_AGENT = field("user_agent", String.class);

    private final DSLContext dsl;

    DownloadLogRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void log(UUID userId, UUID contentId, String ipAddress, String userAgent) {
        dsl.insertInto(DOWNLOAD_LOGS)
            .set(USER_ID, userId)
            .set(CONTENT_ID, contentId)
            .set(IP_ADDRESS, ipAddress)
            .set(USER_AGENT, userAgent)
            .execute();
    }
}
