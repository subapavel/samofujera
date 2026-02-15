package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_FILES;

@Repository
public class ProductFileRepository {

    private final DSLContext dsl;

    ProductFileRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record FileRow(
        UUID id, UUID productId, String fileKey, String fileName,
        long fileSizeBytes, String mimeType, int sortOrder, OffsetDateTime createdAt
    ) {}

    public List<FileRow> findByProductId(UUID productId) {
        return dsl.select(
                PRODUCT_FILES.ID, PRODUCT_FILES.PRODUCT_ID, PRODUCT_FILES.FILE_KEY,
                PRODUCT_FILES.FILE_NAME, PRODUCT_FILES.FILE_SIZE_BYTES,
                PRODUCT_FILES.MIME_TYPE, PRODUCT_FILES.SORT_ORDER, PRODUCT_FILES.CREATED_AT)
            .from(PRODUCT_FILES)
            .where(PRODUCT_FILES.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_FILES.SORT_ORDER.asc())
            .fetch(r -> new FileRow(
                r.get(PRODUCT_FILES.ID),
                r.get(PRODUCT_FILES.PRODUCT_ID),
                r.get(PRODUCT_FILES.FILE_KEY),
                r.get(PRODUCT_FILES.FILE_NAME),
                r.get(PRODUCT_FILES.FILE_SIZE_BYTES),
                r.get(PRODUCT_FILES.MIME_TYPE),
                r.get(PRODUCT_FILES.SORT_ORDER),
                r.get(PRODUCT_FILES.CREATED_AT)
            ));
    }

    public Optional<FileRow> findById(UUID id) {
        return dsl.select(
                PRODUCT_FILES.ID, PRODUCT_FILES.PRODUCT_ID, PRODUCT_FILES.FILE_KEY,
                PRODUCT_FILES.FILE_NAME, PRODUCT_FILES.FILE_SIZE_BYTES,
                PRODUCT_FILES.MIME_TYPE, PRODUCT_FILES.SORT_ORDER, PRODUCT_FILES.CREATED_AT)
            .from(PRODUCT_FILES)
            .where(PRODUCT_FILES.ID.eq(id))
            .fetchOptional(r -> new FileRow(
                r.get(PRODUCT_FILES.ID),
                r.get(PRODUCT_FILES.PRODUCT_ID),
                r.get(PRODUCT_FILES.FILE_KEY),
                r.get(PRODUCT_FILES.FILE_NAME),
                r.get(PRODUCT_FILES.FILE_SIZE_BYTES),
                r.get(PRODUCT_FILES.MIME_TYPE),
                r.get(PRODUCT_FILES.SORT_ORDER),
                r.get(PRODUCT_FILES.CREATED_AT)
            ));
    }

    public UUID create(UUID productId, String fileKey, String fileName,
                       long fileSizeBytes, String mimeType, int sortOrder) {
        return dsl.insertInto(PRODUCT_FILES)
            .set(PRODUCT_FILES.PRODUCT_ID, productId)
            .set(PRODUCT_FILES.FILE_KEY, fileKey)
            .set(PRODUCT_FILES.FILE_NAME, fileName)
            .set(PRODUCT_FILES.FILE_SIZE_BYTES, fileSizeBytes)
            .set(PRODUCT_FILES.MIME_TYPE, mimeType)
            .set(PRODUCT_FILES.SORT_ORDER, sortOrder)
            .returning(PRODUCT_FILES.ID)
            .fetchOne()
            .getId();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(PRODUCT_FILES)
            .where(PRODUCT_FILES.ID.eq(id))
            .execute();
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(PRODUCT_FILES)
            .where(PRODUCT_FILES.PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }
}
