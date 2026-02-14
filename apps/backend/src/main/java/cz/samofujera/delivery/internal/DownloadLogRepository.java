package cz.samofujera.delivery.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.DOWNLOAD_LOGS;

@Repository
public class DownloadLogRepository {

    private final DSLContext dsl;

    DownloadLogRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void log(UUID userId, UUID assetId, String ipAddress, String userAgent) {
        dsl.insertInto(DOWNLOAD_LOGS)
            .set(DOWNLOAD_LOGS.USER_ID, userId)
            .set(DOWNLOAD_LOGS.ASSET_ID, assetId)
            .set(DOWNLOAD_LOGS.IP_ADDRESS, ipAddress)
            .set(DOWNLOAD_LOGS.USER_AGENT, userAgent)
            .execute();
    }
}
