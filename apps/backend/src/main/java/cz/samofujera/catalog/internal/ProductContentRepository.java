package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.jooq.Record;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.jooq.impl.DSL.field;
import static org.jooq.impl.DSL.table;

@Repository
public class ProductContentRepository {

    private static final org.jooq.Table<Record> PRODUCT_CONTENT = table("product_content");
    private static final org.jooq.Field<UUID> ID = field("id", UUID.class);
    private static final org.jooq.Field<UUID> PRODUCT_ID = field("product_id", UUID.class);
    private static final org.jooq.Field<String> CONTENT_TYPE = field("content_type", String.class);
    private static final org.jooq.Field<String> TITLE = field("title", String.class);
    private static final org.jooq.Field<Boolean> IS_PREVIEW = field("is_preview", Boolean.class);
    private static final org.jooq.Field<String> STORAGE_KEY = field("storage_key", String.class);
    private static final org.jooq.Field<String> ORIGINAL_FILENAME = field("original_filename", String.class);
    private static final org.jooq.Field<String> MIME_TYPE = field("mime_type", String.class);
    private static final org.jooq.Field<Long> FILE_SIZE_BYTES = field("file_size_bytes", Long.class);
    private static final org.jooq.Field<String> STREAM_UID = field("stream_uid", String.class);
    private static final org.jooq.Field<Integer> DURATION_SECONDS = field("duration_seconds", Integer.class);
    private static final org.jooq.Field<Integer> SORT_ORDER = field("sort_order", Integer.class);
    private static final org.jooq.Field<OffsetDateTime> CREATED_AT = field("created_at", OffsetDateTime.class);
    private static final org.jooq.Field<OffsetDateTime> UPDATED_AT = field("updated_at", OffsetDateTime.class);

    private final DSLContext dsl;

    ProductContentRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ContentRow(
        UUID id, UUID productId, String contentType, String title,
        boolean isPreview, String storageKey, String originalFilename,
        String mimeType, Long fileSizeBytes, String streamUid,
        Integer durationSeconds, int sortOrder, OffsetDateTime createdAt
    ) {}

    public List<ContentRow> findByProductId(UUID productId) {
        return dsl.select(ID, PRODUCT_ID, CONTENT_TYPE, TITLE, IS_PREVIEW,
                STORAGE_KEY, ORIGINAL_FILENAME, MIME_TYPE, FILE_SIZE_BYTES,
                STREAM_UID, DURATION_SECONDS, SORT_ORDER, CREATED_AT)
            .from(PRODUCT_CONTENT)
            .where(PRODUCT_ID.eq(productId))
            .orderBy(SORT_ORDER.asc())
            .fetch(this::toContentRow);
    }

    public Optional<ContentRow> findById(UUID id) {
        return dsl.select(ID, PRODUCT_ID, CONTENT_TYPE, TITLE, IS_PREVIEW,
                STORAGE_KEY, ORIGINAL_FILENAME, MIME_TYPE, FILE_SIZE_BYTES,
                STREAM_UID, DURATION_SECONDS, SORT_ORDER, CREATED_AT)
            .from(PRODUCT_CONTENT)
            .where(ID.eq(id))
            .fetchOptional(this::toContentRow);
    }

    public UUID create(UUID productId, String contentType, String title, boolean isPreview,
                       String storageKey, String originalFilename, String mimeType,
                       Long fileSizeBytes, String streamUid, Integer durationSeconds,
                       int sortOrder) {
        return dsl.insertInto(PRODUCT_CONTENT)
            .set(PRODUCT_ID, productId)
            .set(CONTENT_TYPE, contentType)
            .set(TITLE, title)
            .set(IS_PREVIEW, isPreview)
            .set(STORAGE_KEY, storageKey)
            .set(ORIGINAL_FILENAME, originalFilename)
            .set(MIME_TYPE, mimeType)
            .set(FILE_SIZE_BYTES, fileSizeBytes)
            .set(STREAM_UID, streamUid)
            .set(DURATION_SECONDS, durationSeconds)
            .set(SORT_ORDER, sortOrder)
            .returning(ID)
            .fetchOne()
            .get(ID);
    }

    public void update(UUID id, String title, Boolean isPreview) {
        var step = dsl.update(PRODUCT_CONTENT).set(UPDATED_AT, OffsetDateTime.now());
        if (title != null) {
            step = step.set(TITLE, title);
        }
        if (isPreview != null) {
            step = step.set(IS_PREVIEW, isPreview);
        }
        step.where(ID.eq(id)).execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PRODUCT_CONTENT)
            .where(ID.eq(id))
            .execute();
    }

    public void reorder(UUID productId, List<UUID> contentIds) {
        for (int i = 0; i < contentIds.size(); i++) {
            dsl.update(PRODUCT_CONTENT)
                .set(SORT_ORDER, i)
                .set(UPDATED_AT, OffsetDateTime.now())
                .where(ID.eq(contentIds.get(i)))
                .and(PRODUCT_ID.eq(productId))
                .execute();
        }
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(PRODUCT_CONTENT)
            .where(PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }

    private ContentRow toContentRow(Record r) {
        return new ContentRow(
            r.get(ID),
            r.get(PRODUCT_ID),
            r.get(CONTENT_TYPE),
            r.get(TITLE),
            Boolean.TRUE.equals(r.get(IS_PREVIEW)),
            r.get(STORAGE_KEY),
            r.get(ORIGINAL_FILENAME),
            r.get(MIME_TYPE),
            r.get(FILE_SIZE_BYTES),
            r.get(STREAM_UID),
            r.get(DURATION_SECONDS),
            r.get(SORT_ORDER),
            r.get(CREATED_AT)
        );
    }
}
