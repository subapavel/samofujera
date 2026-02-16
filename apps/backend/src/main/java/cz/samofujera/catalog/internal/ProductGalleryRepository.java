package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PRODUCT_GALLERY;

@Repository
public class ProductGalleryRepository {

    public record GalleryEntry(UUID id, UUID productId, UUID mediaItemId, int sortOrder) {}

    private final DSLContext dsl;

    ProductGalleryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<GalleryEntry> findByProductId(UUID productId) {
        return dsl.select(
                PRODUCT_GALLERY.ID, PRODUCT_GALLERY.PRODUCT_ID,
                PRODUCT_GALLERY.MEDIA_ITEM_ID, PRODUCT_GALLERY.SORT_ORDER)
            .from(PRODUCT_GALLERY)
            .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
            .orderBy(PRODUCT_GALLERY.SORT_ORDER.asc())
            .fetch(r -> new GalleryEntry(
                r.get(PRODUCT_GALLERY.ID),
                r.get(PRODUCT_GALLERY.PRODUCT_ID),
                r.get(PRODUCT_GALLERY.MEDIA_ITEM_ID),
                r.get(PRODUCT_GALLERY.SORT_ORDER)));
    }

    public UUID add(UUID productId, UUID mediaItemId, int sortOrder) {
        return dsl.insertInto(PRODUCT_GALLERY)
            .set(PRODUCT_GALLERY.PRODUCT_ID, productId)
            .set(PRODUCT_GALLERY.MEDIA_ITEM_ID, mediaItemId)
            .set(PRODUCT_GALLERY.SORT_ORDER, sortOrder)
            .returning(PRODUCT_GALLERY.ID)
            .fetchOne()
            .getId();
    }

    public void remove(UUID productId, UUID mediaItemId) {
        dsl.deleteFrom(PRODUCT_GALLERY)
            .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
            .and(PRODUCT_GALLERY.MEDIA_ITEM_ID.eq(mediaItemId))
            .execute();
    }

    public void reorder(UUID productId, List<UUID> mediaItemIds) {
        for (int i = 0; i < mediaItemIds.size(); i++) {
            dsl.update(PRODUCT_GALLERY)
                .set(PRODUCT_GALLERY.SORT_ORDER, i)
                .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
                .and(PRODUCT_GALLERY.MEDIA_ITEM_ID.eq(mediaItemIds.get(i)))
                .execute();
        }
    }

    public int countByProductId(UUID productId) {
        return dsl.selectCount()
            .from(PRODUCT_GALLERY)
            .where(PRODUCT_GALLERY.PRODUCT_ID.eq(productId))
            .fetchOne(0, int.class);
    }
}
