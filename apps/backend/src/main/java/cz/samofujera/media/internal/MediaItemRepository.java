package cz.samofujera.media.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.MEDIA_ITEMS;

@Repository
public class MediaItemRepository {

    private final DSLContext dsl;

    MediaItemRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record MediaItemRow(UUID id, UUID folderId, String originalFilename, String storageKey,
                                String mimeType, long fileSizeBytes, Integer width, Integer height,
                                String altText, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}

    public List<MediaItemRow> findAll(UUID folderId, String mimeTypePrefix, String search, int offset, int limit) {
        var condition = buildCondition(folderId, mimeTypePrefix, search);

        return dsl.selectFrom(MEDIA_ITEMS)
            .where(condition)
            .orderBy(MEDIA_ITEMS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(this::toRow);
    }

    public long count(UUID folderId, String mimeTypePrefix, String search) {
        var condition = buildCondition(folderId, mimeTypePrefix, search);

        return dsl.selectCount()
            .from(MEDIA_ITEMS)
            .where(condition)
            .fetchOne(0, long.class);
    }

    public Optional<MediaItemRow> findById(UUID id) {
        return dsl.selectFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.ID.eq(id))
            .fetchOptional(this::toRow);
    }

    public UUID create(UUID folderId, String originalFilename, String storageKey, String mimeType,
                       long fileSizeBytes, Integer width, Integer height, String altText) {
        return dsl.insertInto(MEDIA_ITEMS)
            .set(MEDIA_ITEMS.FOLDER_ID, folderId)
            .set(MEDIA_ITEMS.ORIGINAL_FILENAME, originalFilename)
            .set(MEDIA_ITEMS.STORAGE_KEY, storageKey)
            .set(MEDIA_ITEMS.MIME_TYPE, mimeType)
            .set(MEDIA_ITEMS.FILE_SIZE_BYTES, fileSizeBytes)
            .set(MEDIA_ITEMS.WIDTH, width)
            .set(MEDIA_ITEMS.HEIGHT, height)
            .set(MEDIA_ITEMS.ALT_TEXT, altText)
            .returning(MEDIA_ITEMS.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String altText, UUID folderId) {
        dsl.update(MEDIA_ITEMS)
            .set(MEDIA_ITEMS.ALT_TEXT, altText)
            .set(MEDIA_ITEMS.FOLDER_ID, folderId)
            .set(MEDIA_ITEMS.UPDATED_AT, OffsetDateTime.now())
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    private Condition buildCondition(UUID folderId, String mimeTypePrefix, String search) {
        Condition condition = DSL.trueCondition();

        if (folderId != null) {
            condition = condition.and(MEDIA_ITEMS.FOLDER_ID.eq(folderId));
        }
        if (mimeTypePrefix != null && !mimeTypePrefix.isBlank()) {
            condition = condition.and(MEDIA_ITEMS.MIME_TYPE.startsWith(mimeTypePrefix));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                MEDIA_ITEMS.ORIGINAL_FILENAME.containsIgnoreCase(search)
                    .or(MEDIA_ITEMS.ALT_TEXT.containsIgnoreCase(search))
            );
        }

        return condition;
    }

    private MediaItemRow toRow(cz.samofujera.generated.jooq.tables.records.MediaItemsRecord r) {
        return new MediaItemRow(
            r.getId(),
            r.getFolderId(),
            r.getOriginalFilename(),
            r.getStorageKey(),
            r.getMimeType(),
            r.getFileSizeBytes(),
            r.getWidth(),
            r.getHeight(),
            r.getAltText(),
            r.getCreatedAt(),
            r.getUpdatedAt()
        );
    }
}
