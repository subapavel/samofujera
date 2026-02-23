package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.Table;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class ProductGalleryRepository {

    // String-based DSL for renamed columns
    private static final Table<?> PG = DSL.table("product_gallery");
    private static final Field<UUID> PG_ID = DSL.field("product_gallery.id", UUID.class);
    private static final Field<UUID> PG_PRODUCT_ID = DSL.field("product_gallery.product_id", UUID.class);
    private static final Field<UUID> PG_IMAGE_ID = DSL.field("product_gallery.image_id", UUID.class);
    private static final Field<Integer> PG_SORT_ORDER = DSL.field("product_gallery.sort_order", Integer.class);
    private static final Field<Integer> PG_PAN_X = DSL.field("product_gallery.pan_x", Integer.class);
    private static final Field<Integer> PG_PAN_Y = DSL.field("product_gallery.pan_y", Integer.class);

    public record GalleryEntry(UUID id, UUID productId, UUID imageId, int panX, int panY, int sortOrder) {}

    private final DSLContext dsl;

    ProductGalleryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<GalleryEntry> findByProductId(UUID productId) {
        return dsl.select(PG_ID, PG_PRODUCT_ID, PG_IMAGE_ID, PG_PAN_X, PG_PAN_Y, PG_SORT_ORDER)
            .from(PG)
            .where(PG_PRODUCT_ID.eq(productId))
            .orderBy(PG_SORT_ORDER.asc())
            .fetch(r -> new GalleryEntry(
                r.get(PG_ID),
                r.get(PG_PRODUCT_ID),
                r.get(PG_IMAGE_ID),
                r.get(PG_PAN_X),
                r.get(PG_PAN_Y),
                r.get(PG_SORT_ORDER)));
    }

    public UUID add(UUID productId, UUID imageId, int sortOrder, int panX, int panY) {
        return dsl.insertInto(PG)
            .set(PG_PRODUCT_ID, productId)
            .set(PG_IMAGE_ID, imageId)
            .set(PG_SORT_ORDER, sortOrder)
            .set(PG_PAN_X, panX)
            .set(PG_PAN_Y, panY)
            .returning(PG_ID)
            .fetchOne()
            .get(PG_ID);
    }

    public void remove(UUID productId, UUID imageId) {
        dsl.deleteFrom(PG)
            .where(PG_PRODUCT_ID.eq(productId))
            .and(PG_IMAGE_ID.eq(imageId))
            .execute();
    }

    public void reorder(UUID productId, List<UUID> imageIds) {
        for (int i = 0; i < imageIds.size(); i++) {
            dsl.update(PG)
                .set(PG_SORT_ORDER, i)
                .where(PG_PRODUCT_ID.eq(productId))
                .and(PG_IMAGE_ID.eq(imageIds.get(i)))
                .execute();
        }
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(PG)
            .where(PG_PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }
}
