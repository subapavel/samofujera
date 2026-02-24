package cz.samofujera.image.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ImageRepository {

    // String-based DSL references for the renamed table
    private static final Table<?> IMAGES = DSL.table("images");
    private static final Field<UUID> ID = DSL.field(DSL.name("images", "id"), UUID.class);
    private static final Field<String> ORIGINAL_FILENAME = DSL.field(DSL.name("images", "original_filename"), String.class);
    private static final Field<String> STORAGE_KEY = DSL.field(DSL.name("images", "storage_key"), String.class);
    private static final Field<String> MIME_TYPE = DSL.field(DSL.name("images", "mime_type"), String.class);
    private static final Field<Long> FILE_SIZE_BYTES = DSL.field(DSL.name("images", "file_size_bytes"), Long.class);
    private static final Field<Integer> WIDTH = DSL.field(DSL.name("images", "width"), Integer.class);
    private static final Field<Integer> HEIGHT = DSL.field(DSL.name("images", "height"), Integer.class);
    private static final Field<String> ALT_TEXT = DSL.field(DSL.name("images", "alt_text"), String.class);
    private static final Field<String> TITLE = DSL.field(DSL.name("images", "title"), String.class);
    private static final Field<OffsetDateTime> CREATED_AT = DSL.field(DSL.name("images", "created_at"), OffsetDateTime.class);
    private static final Field<OffsetDateTime> UPDATED_AT = DSL.field(DSL.name("images", "updated_at"), OffsetDateTime.class);

    // String-based DSL for renamed FK columns
    private static final Field<UUID> GALLERY_IMAGE_ID = DSL.field(DSL.name("product_gallery", "image_id"), UUID.class);
    private static final Field<UUID> CATEGORY_IMAGE_ID = DSL.field(DSL.name("product_categories", "image_id"), UUID.class);

    private final DSLContext dsl;

    ImageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ImageRow(UUID id, String originalFilename, String storageKey,
                            String mimeType, long fileSizeBytes, Integer width, Integer height,
                            String altText, String title,
                            OffsetDateTime createdAt, OffsetDateTime updatedAt) {}

    public List<ImageRow> findAll(String source, String mimeTypePrefix, String search, int offset, int limit) {
        var condition = buildCondition(source, mimeTypePrefix, search);

        return dsl.select(ID, ORIGINAL_FILENAME, STORAGE_KEY, MIME_TYPE, FILE_SIZE_BYTES,
                WIDTH, HEIGHT, ALT_TEXT, TITLE, CREATED_AT, UPDATED_AT)
            .from(IMAGES)
            .where(condition)
            .orderBy(CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(r -> new ImageRow(
                r.get(ID), r.get(ORIGINAL_FILENAME), r.get(STORAGE_KEY),
                r.get(MIME_TYPE), r.get(FILE_SIZE_BYTES),
                r.get(WIDTH), r.get(HEIGHT), r.get(ALT_TEXT), r.get(TITLE),
                r.get(CREATED_AT), r.get(UPDATED_AT)
            ));
    }

    public long count(String source, String mimeTypePrefix, String search) {
        var condition = buildCondition(source, mimeTypePrefix, search);

        return dsl.selectCount()
            .from(IMAGES)
            .where(condition)
            .fetchOne(0, long.class);
    }

    public Optional<ImageRow> findById(UUID id) {
        return dsl.select(ID, ORIGINAL_FILENAME, STORAGE_KEY, MIME_TYPE, FILE_SIZE_BYTES,
                WIDTH, HEIGHT, ALT_TEXT, TITLE, CREATED_AT, UPDATED_AT)
            .from(IMAGES)
            .where(ID.eq(id))
            .fetchOptional(r -> new ImageRow(
                r.get(ID), r.get(ORIGINAL_FILENAME), r.get(STORAGE_KEY),
                r.get(MIME_TYPE), r.get(FILE_SIZE_BYTES),
                r.get(WIDTH), r.get(HEIGHT), r.get(ALT_TEXT), r.get(TITLE),
                r.get(CREATED_AT), r.get(UPDATED_AT)
            ));
    }

    public UUID create(String originalFilename, String storageKey, String mimeType,
                       long fileSizeBytes, Integer width, Integer height,
                       String altText, String title) {
        return dsl.insertInto(IMAGES)
            .set(ORIGINAL_FILENAME, originalFilename)
            .set(STORAGE_KEY, storageKey)
            .set(MIME_TYPE, mimeType)
            .set(FILE_SIZE_BYTES, fileSizeBytes)
            .set(WIDTH, width)
            .set(HEIGHT, height)
            .set(ALT_TEXT, altText)
            .set(TITLE, title)
            .returning(ID)
            .fetchOne()
            .get(ID);
    }

    public void update(UUID id, String altText, String title) {
        dsl.update(IMAGES)
            .set(ALT_TEXT, altText)
            .set(TITLE, title)
            .set(UPDATED_AT, OffsetDateTime.now())
            .where(ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(IMAGES)
            .where(ID.eq(id))
            .execute();
    }

    public List<UUID> findAllIds() {
        return dsl.select(ID)
            .from(IMAGES)
            .fetch(ID);
    }

    private Condition buildCondition(String source, String mimeTypePrefix, String search) {
        Condition condition = DSL.trueCondition();

        if (source != null && !source.isBlank()) {
            condition = condition.and(buildSourceCondition(source));
        }
        if (mimeTypePrefix != null && !mimeTypePrefix.isBlank()) {
            condition = condition.and(MIME_TYPE.startsWith(mimeTypePrefix));
        }
        if (search != null && !search.isBlank()) {
            condition = condition.and(
                ORIGINAL_FILENAME.containsIgnoreCase(search)
                    .or(ALT_TEXT.containsIgnoreCase(search))
                    .or(TITLE.containsIgnoreCase(search))
            );
        }

        return condition;
    }

    private Condition buildSourceCondition(String source) {
        var inProductGallery = ID.in(
            DSL.select(GALLERY_IMAGE_ID).from(DSL.table("product_gallery"))
        );
        var inProductCategories = ID.in(
            DSL.select(CATEGORY_IMAGE_ID)
                .from(DSL.table("product_categories"))
                .where(CATEGORY_IMAGE_ID.isNotNull())
        );

        return switch (source) {
            case "products" -> inProductGallery;
            case "product_categories" -> inProductCategories;
            case "unlinked" -> inProductGallery.not().and(inProductCategories.not());
            default -> DSL.trueCondition();
        };
    }
}
