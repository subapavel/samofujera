package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.EVENTS;

@Repository
public class EventRepository {

    private final DSLContext dsl;

    EventRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record EventRow(
        UUID id, UUID productId, String venue, Integer capacity,
        boolean isOnline, String streamUrl, UUID recordingProductId,
        OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public Optional<EventRow> findByProductId(UUID productId) {
        return dsl.select(
                EVENTS.ID, EVENTS.PRODUCT_ID, EVENTS.VENUE, EVENTS.CAPACITY,
                EVENTS.IS_ONLINE, EVENTS.STREAM_URL, EVENTS.RECORDING_PRODUCT_ID,
                EVENTS.CREATED_AT, EVENTS.UPDATED_AT)
            .from(EVENTS)
            .where(EVENTS.PRODUCT_ID.eq(productId))
            .fetchOptional(r -> new EventRow(
                r.get(EVENTS.ID),
                r.get(EVENTS.PRODUCT_ID),
                r.get(EVENTS.VENUE),
                r.get(EVENTS.CAPACITY),
                r.get(EVENTS.IS_ONLINE),
                r.get(EVENTS.STREAM_URL),
                r.get(EVENTS.RECORDING_PRODUCT_ID),
                r.get(EVENTS.CREATED_AT),
                r.get(EVENTS.UPDATED_AT)
            ));
    }

    public UUID create(UUID productId, String venue, Integer capacity,
                       boolean isOnline, String streamUrl, UUID recordingProductId) {
        return dsl.insertInto(EVENTS)
            .set(EVENTS.PRODUCT_ID, productId)
            .set(EVENTS.VENUE, venue)
            .set(EVENTS.CAPACITY, capacity)
            .set(EVENTS.IS_ONLINE, isOnline)
            .set(EVENTS.STREAM_URL, streamUrl)
            .set(EVENTS.RECORDING_PRODUCT_ID, recordingProductId)
            .returning(EVENTS.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String venue, Integer capacity,
                       boolean isOnline, String streamUrl, UUID recordingProductId) {
        dsl.update(EVENTS)
            .set(EVENTS.VENUE, venue)
            .set(EVENTS.CAPACITY, capacity)
            .set(EVENTS.IS_ONLINE, isOnline)
            .set(EVENTS.STREAM_URL, streamUrl)
            .set(EVENTS.RECORDING_PRODUCT_ID, recordingProductId)
            .set(EVENTS.UPDATED_AT, OffsetDateTime.now())
            .where(EVENTS.ID.eq(id))
            .execute();
    }

    public void deleteByProductId(UUID productId) {
        dsl.deleteFrom(EVENTS)
            .where(EVENTS.PRODUCT_ID.eq(productId))
            .execute();
    }
}
