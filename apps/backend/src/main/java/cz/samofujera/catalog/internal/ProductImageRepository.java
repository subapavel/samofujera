package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_IMAGES;

@Repository
public class ProductImageRepository {

    private final DSLContext dsl;

    ProductImageRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ImageRow(
        UUID id, UUID productId, String fileKey, String fileName,
        Long fileSizeBytes, String contentType, String altText,
        int sortOrder, OffsetDateTime createdAt
    ) {}

    public List<ImageRow> findByProductId(UUID productId) {
        return dsl.select(
                PRODUCT_IMAGES.ID, PRODUCT_IMAGES.PRODUCT_ID, PRODUCT_IMAGES.FILE_KEY,
                PRODUCT_IMAGES.FILE_NAME, PRODUCT_IMAGES.FILE_SIZE_BYTES,
                PRODUCT_IMAGES.CONTENT_TYPE, PRODUCT_IMAGES.ALT_TEXT,
                PRODUCT_IMAGES.SORT_ORDER, PRODUCT_IMAGES.CREATED_AT)
            .from(PRODUCT_IMAGES)
            .where(PRODUCT_IMAGES.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_IMAGES.SORT_ORDER.asc())
            .fetch(r -> new ImageRow(
                r.get(PRODUCT_IMAGES.ID),
                r.get(PRODUCT_IMAGES.PRODUCT_ID),
                r.get(PRODUCT_IMAGES.FILE_KEY),
                r.get(PRODUCT_IMAGES.FILE_NAME),
                r.get(PRODUCT_IMAGES.FILE_SIZE_BYTES),
                r.get(PRODUCT_IMAGES.CONTENT_TYPE),
                r.get(PRODUCT_IMAGES.ALT_TEXT),
                r.get(PRODUCT_IMAGES.SORT_ORDER),
                r.get(PRODUCT_IMAGES.CREATED_AT)
            ));
    }

    public Optional<ImageRow> findById(UUID id) {
        return dsl.select(
                PRODUCT_IMAGES.ID, PRODUCT_IMAGES.PRODUCT_ID, PRODUCT_IMAGES.FILE_KEY,
                PRODUCT_IMAGES.FILE_NAME, PRODUCT_IMAGES.FILE_SIZE_BYTES,
                PRODUCT_IMAGES.CONTENT_TYPE, PRODUCT_IMAGES.ALT_TEXT,
                PRODUCT_IMAGES.SORT_ORDER, PRODUCT_IMAGES.CREATED_AT)
            .from(PRODUCT_IMAGES)
            .where(PRODUCT_IMAGES.ID.eq(id))
            .fetchOptional(r -> new ImageRow(
                r.get(PRODUCT_IMAGES.ID),
                r.get(PRODUCT_IMAGES.PRODUCT_ID),
                r.get(PRODUCT_IMAGES.FILE_KEY),
                r.get(PRODUCT_IMAGES.FILE_NAME),
                r.get(PRODUCT_IMAGES.FILE_SIZE_BYTES),
                r.get(PRODUCT_IMAGES.CONTENT_TYPE),
                r.get(PRODUCT_IMAGES.ALT_TEXT),
                r.get(PRODUCT_IMAGES.SORT_ORDER),
                r.get(PRODUCT_IMAGES.CREATED_AT)
            ));
    }

    public UUID create(UUID productId, String fileKey, String fileName,
                       Long fileSizeBytes, String contentType, String altText, int sortOrder) {
        return dsl.insertInto(PRODUCT_IMAGES)
            .set(PRODUCT_IMAGES.PRODUCT_ID, productId)
            .set(PRODUCT_IMAGES.FILE_KEY, fileKey)
            .set(PRODUCT_IMAGES.FILE_NAME, fileName)
            .set(PRODUCT_IMAGES.FILE_SIZE_BYTES, fileSizeBytes)
            .set(PRODUCT_IMAGES.CONTENT_TYPE, contentType)
            .set(PRODUCT_IMAGES.ALT_TEXT, altText)
            .set(PRODUCT_IMAGES.SORT_ORDER, sortOrder)
            .returning(PRODUCT_IMAGES.ID)
            .fetchOne()
            .getId();
    }

    public String delete(UUID id) {
        var fileKey = dsl.select(PRODUCT_IMAGES.FILE_KEY)
            .from(PRODUCT_IMAGES)
            .where(PRODUCT_IMAGES.ID.eq(id))
            .fetchOne(PRODUCT_IMAGES.FILE_KEY);

        dsl.deleteFrom(PRODUCT_IMAGES)
            .where(PRODUCT_IMAGES.ID.eq(id))
            .execute();

        return fileKey;
    }

    public void reorder(List<UUID> imageIds) {
        for (int i = 0; i < imageIds.size(); i++) {
            dsl.update(PRODUCT_IMAGES)
                .set(PRODUCT_IMAGES.SORT_ORDER, i)
                .where(PRODUCT_IMAGES.ID.eq(imageIds.get(i)))
                .execute();
        }
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(PRODUCT_IMAGES)
            .where(PRODUCT_IMAGES.PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }

    public void updateAltText(UUID id, String altText) {
        dsl.update(PRODUCT_IMAGES)
            .set(PRODUCT_IMAGES.ALT_TEXT, altText)
            .where(PRODUCT_IMAGES.ID.eq(id))
            .execute();
    }
}
