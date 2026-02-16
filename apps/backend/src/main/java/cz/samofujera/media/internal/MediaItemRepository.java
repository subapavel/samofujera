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
import static cz.samofujera.generated.jooq.Tables.PRODUCT_CATEGORIES;
import static cz.samofujera.generated.jooq.Tables.PRODUCT_GALLERY;

@Repository
public class MediaItemRepository {

    private final DSLContext dsl;

    MediaItemRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record MediaItemRow(UUID id, String originalFilename, String storageKey,
                                String mimeType, long fileSizeBytes, Integer width, Integer height,
                                String altText, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}

    public List<MediaItemRow> findAll(String source, String mimeTypePrefix, String search, int offset, int limit) {
        var condition = buildCondition(source, mimeTypePrefix, search);

        return dsl.selectFrom(MEDIA_ITEMS)
            .where(condition)
            .orderBy(MEDIA_ITEMS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(this::toRow);
    }

    public long count(String source, String mimeTypePrefix, String search) {
        var condition = buildCondition(source, mimeTypePrefix, search);

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

    public UUID create(String originalFilename, String storageKey, String mimeType,
                       long fileSizeBytes, Integer width, Integer height, String altText) {
        return dsl.insertInto(MEDIA_ITEMS)
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

    public void update(UUID id, String altText) {
        dsl.update(MEDIA_ITEMS)
            .set(MEDIA_ITEMS.ALT_TEXT, altText)
            .set(MEDIA_ITEMS.UPDATED_AT, OffsetDateTime.now())
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    private Condition buildCondition(String source, String mimeTypePrefix, String search) {
        Condition condition = DSL.trueCondition();

        if (source != null && !source.isBlank()) {
            condition = condition.and(buildSourceCondition(source));
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

    private Condition buildSourceCondition(String source) {
        var inProductGallery = MEDIA_ITEMS.ID.in(
            DSL.select(PRODUCT_GALLERY.MEDIA_ITEM_ID).from(PRODUCT_GALLERY)
        );
        var inProductCategories = MEDIA_ITEMS.ID.in(
            DSL.select(PRODUCT_CATEGORIES.IMAGE_MEDIA_ID)
                .from(PRODUCT_CATEGORIES)
                .where(PRODUCT_CATEGORIES.IMAGE_MEDIA_ID.isNotNull())
        );

        return switch (source) {
            case "products" -> inProductGallery;
            case "product_categories" -> inProductCategories;
            case "unlinked" -> inProductGallery.not().and(inProductCategories.not());
            default -> DSL.trueCondition();
        };
    }

    private MediaItemRow toRow(cz.samofujera.generated.jooq.tables.records.MediaItemsRecord r) {
        return new MediaItemRow(
            r.getId(),
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
