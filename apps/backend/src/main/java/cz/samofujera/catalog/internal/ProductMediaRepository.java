package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_MEDIA;

@Repository
public class ProductMediaRepository {

    private final DSLContext dsl;

    ProductMediaRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record MediaRow(
        UUID id, UUID productId, String title, String mediaType,
        String cfStreamUid, String fileKey, Integer durationSeconds, int sortOrder
    ) {}

    public List<MediaRow> findByProductId(UUID productId) {
        return dsl.select(
                PRODUCT_MEDIA.ID, PRODUCT_MEDIA.PRODUCT_ID, PRODUCT_MEDIA.TITLE,
                PRODUCT_MEDIA.MEDIA_TYPE, PRODUCT_MEDIA.CF_STREAM_UID,
                PRODUCT_MEDIA.FILE_KEY, PRODUCT_MEDIA.DURATION_SECONDS, PRODUCT_MEDIA.SORT_ORDER)
            .from(PRODUCT_MEDIA)
            .where(PRODUCT_MEDIA.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_MEDIA.SORT_ORDER.asc())
            .fetch(r -> new MediaRow(
                r.get(PRODUCT_MEDIA.ID),
                r.get(PRODUCT_MEDIA.PRODUCT_ID),
                r.get(PRODUCT_MEDIA.TITLE),
                r.get(PRODUCT_MEDIA.MEDIA_TYPE),
                r.get(PRODUCT_MEDIA.CF_STREAM_UID),
                r.get(PRODUCT_MEDIA.FILE_KEY),
                r.get(PRODUCT_MEDIA.DURATION_SECONDS),
                r.get(PRODUCT_MEDIA.SORT_ORDER)
            ));
    }

    public Optional<MediaRow> findById(UUID id) {
        return dsl.select(
                PRODUCT_MEDIA.ID, PRODUCT_MEDIA.PRODUCT_ID, PRODUCT_MEDIA.TITLE,
                PRODUCT_MEDIA.MEDIA_TYPE, PRODUCT_MEDIA.CF_STREAM_UID,
                PRODUCT_MEDIA.FILE_KEY, PRODUCT_MEDIA.DURATION_SECONDS, PRODUCT_MEDIA.SORT_ORDER)
            .from(PRODUCT_MEDIA)
            .where(PRODUCT_MEDIA.ID.eq(id))
            .fetchOptional(r -> new MediaRow(
                r.get(PRODUCT_MEDIA.ID),
                r.get(PRODUCT_MEDIA.PRODUCT_ID),
                r.get(PRODUCT_MEDIA.TITLE),
                r.get(PRODUCT_MEDIA.MEDIA_TYPE),
                r.get(PRODUCT_MEDIA.CF_STREAM_UID),
                r.get(PRODUCT_MEDIA.FILE_KEY),
                r.get(PRODUCT_MEDIA.DURATION_SECONDS),
                r.get(PRODUCT_MEDIA.SORT_ORDER)
            ));
    }

    public UUID create(UUID productId, String title, String mediaType,
                       String cfStreamUid, String fileKey, Integer durationSeconds, int sortOrder) {
        return dsl.insertInto(PRODUCT_MEDIA)
            .set(PRODUCT_MEDIA.PRODUCT_ID, productId)
            .set(PRODUCT_MEDIA.TITLE, title)
            .set(PRODUCT_MEDIA.MEDIA_TYPE, mediaType)
            .set(PRODUCT_MEDIA.CF_STREAM_UID, cfStreamUid)
            .set(PRODUCT_MEDIA.FILE_KEY, fileKey)
            .set(PRODUCT_MEDIA.DURATION_SECONDS, durationSeconds)
            .set(PRODUCT_MEDIA.SORT_ORDER, sortOrder)
            .returning(PRODUCT_MEDIA.ID)
            .fetchOne()
            .getId();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PRODUCT_MEDIA)
            .where(PRODUCT_MEDIA.ID.eq(id))
            .execute();
    }

    public void deleteByProductId(UUID productId) {
        dsl.deleteFrom(PRODUCT_MEDIA)
            .where(PRODUCT_MEDIA.PRODUCT_ID.eq(productId))
            .execute();
    }
}
