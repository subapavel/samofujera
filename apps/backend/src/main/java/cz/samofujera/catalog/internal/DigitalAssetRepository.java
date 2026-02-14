package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.DIGITAL_ASSETS;

@Repository
public class DigitalAssetRepository {

    private final DSLContext dsl;

    DigitalAssetRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record AssetRow(
        UUID id,
        UUID productId,
        String assetType,
        String fileKey,
        String fileName,
        long fileSizeBytes,
        String mimeType,
        String streamUid,
        Integer durationSeconds,
        int sortOrder,
        OffsetDateTime createdAt
    ) {}

    public List<AssetRow> findByProductId(UUID productId) {
        return dsl.select(
                DIGITAL_ASSETS.ID, DIGITAL_ASSETS.PRODUCT_ID, DIGITAL_ASSETS.ASSET_TYPE,
                DIGITAL_ASSETS.FILE_KEY, DIGITAL_ASSETS.FILE_NAME, DIGITAL_ASSETS.FILE_SIZE_BYTES,
                DIGITAL_ASSETS.MIME_TYPE, DIGITAL_ASSETS.STREAM_UID, DIGITAL_ASSETS.DURATION_SECONDS,
                DIGITAL_ASSETS.SORT_ORDER, DIGITAL_ASSETS.CREATED_AT)
            .from(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.PRODUCT_ID.eq(productId))
            .orderBy(DIGITAL_ASSETS.SORT_ORDER.asc())
            .fetch(r -> new AssetRow(
                r.get(DIGITAL_ASSETS.ID),
                r.get(DIGITAL_ASSETS.PRODUCT_ID),
                r.get(DIGITAL_ASSETS.ASSET_TYPE),
                r.get(DIGITAL_ASSETS.FILE_KEY),
                r.get(DIGITAL_ASSETS.FILE_NAME),
                r.get(DIGITAL_ASSETS.FILE_SIZE_BYTES),
                r.get(DIGITAL_ASSETS.MIME_TYPE),
                r.get(DIGITAL_ASSETS.STREAM_UID),
                r.get(DIGITAL_ASSETS.DURATION_SECONDS),
                r.get(DIGITAL_ASSETS.SORT_ORDER),
                r.get(DIGITAL_ASSETS.CREATED_AT)
            ));
    }

    public Optional<AssetRow> findById(UUID id) {
        return dsl.select(
                DIGITAL_ASSETS.ID, DIGITAL_ASSETS.PRODUCT_ID, DIGITAL_ASSETS.ASSET_TYPE,
                DIGITAL_ASSETS.FILE_KEY, DIGITAL_ASSETS.FILE_NAME, DIGITAL_ASSETS.FILE_SIZE_BYTES,
                DIGITAL_ASSETS.MIME_TYPE, DIGITAL_ASSETS.STREAM_UID, DIGITAL_ASSETS.DURATION_SECONDS,
                DIGITAL_ASSETS.SORT_ORDER, DIGITAL_ASSETS.CREATED_AT)
            .from(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.ID.eq(id))
            .fetchOptional(r -> new AssetRow(
                r.get(DIGITAL_ASSETS.ID),
                r.get(DIGITAL_ASSETS.PRODUCT_ID),
                r.get(DIGITAL_ASSETS.ASSET_TYPE),
                r.get(DIGITAL_ASSETS.FILE_KEY),
                r.get(DIGITAL_ASSETS.FILE_NAME),
                r.get(DIGITAL_ASSETS.FILE_SIZE_BYTES),
                r.get(DIGITAL_ASSETS.MIME_TYPE),
                r.get(DIGITAL_ASSETS.STREAM_UID),
                r.get(DIGITAL_ASSETS.DURATION_SECONDS),
                r.get(DIGITAL_ASSETS.SORT_ORDER),
                r.get(DIGITAL_ASSETS.CREATED_AT)
            ));
    }

    public UUID create(UUID productId, String assetType, String fileKey, String fileName,
                       long fileSizeBytes, String mimeType, int sortOrder) {
        return dsl.insertInto(DIGITAL_ASSETS)
            .set(DIGITAL_ASSETS.PRODUCT_ID, productId)
            .set(DIGITAL_ASSETS.ASSET_TYPE, assetType)
            .set(DIGITAL_ASSETS.FILE_KEY, fileKey)
            .set(DIGITAL_ASSETS.FILE_NAME, fileName)
            .set(DIGITAL_ASSETS.FILE_SIZE_BYTES, fileSizeBytes)
            .set(DIGITAL_ASSETS.MIME_TYPE, mimeType)
            .set(DIGITAL_ASSETS.SORT_ORDER, sortOrder)
            .returning(DIGITAL_ASSETS.ID)
            .fetchOne()
            .getId();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.ID.eq(id))
            .execute();
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(DIGITAL_ASSETS)
            .where(DIGITAL_ASSETS.PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }
}
