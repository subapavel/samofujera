package cz.samofujera.catalog.internal;

import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.EVENT_OCCURRENCES;

@Repository
public class EventOccurrenceRepository {

    private final DSLContext dsl;

    EventOccurrenceRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record OccurrenceRow(
        UUID id, UUID eventId, OffsetDateTime startsAt, OffsetDateTime endsAt,
        String status, String streamUrl, OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public List<OccurrenceRow> findByEventId(UUID eventId) {
        return dsl.select(
                EVENT_OCCURRENCES.ID, EVENT_OCCURRENCES.EVENT_ID,
                EVENT_OCCURRENCES.STARTS_AT, EVENT_OCCURRENCES.ENDS_AT,
                EVENT_OCCURRENCES.STATUS, EVENT_OCCURRENCES.STREAM_URL,
                EVENT_OCCURRENCES.CREATED_AT, EVENT_OCCURRENCES.UPDATED_AT)
            .from(EVENT_OCCURRENCES)
            .where(EVENT_OCCURRENCES.EVENT_ID.eq(eventId))
            .orderBy(EVENT_OCCURRENCES.STARTS_AT.asc())
            .fetch(r -> new OccurrenceRow(
                r.get(EVENT_OCCURRENCES.ID),
                r.get(EVENT_OCCURRENCES.EVENT_ID),
                r.get(EVENT_OCCURRENCES.STARTS_AT),
                r.get(EVENT_OCCURRENCES.ENDS_AT),
                r.get(EVENT_OCCURRENCES.STATUS),
                r.get(EVENT_OCCURRENCES.STREAM_URL),
                r.get(EVENT_OCCURRENCES.CREATED_AT),
                r.get(EVENT_OCCURRENCES.UPDATED_AT)
            ));
    }

    public Optional<OccurrenceRow> findById(UUID id) {
        return dsl.select(
                EVENT_OCCURRENCES.ID, EVENT_OCCURRENCES.EVENT_ID,
                EVENT_OCCURRENCES.STARTS_AT, EVENT_OCCURRENCES.ENDS_AT,
                EVENT_OCCURRENCES.STATUS, EVENT_OCCURRENCES.STREAM_URL,
                EVENT_OCCURRENCES.CREATED_AT, EVENT_OCCURRENCES.UPDATED_AT)
            .from(EVENT_OCCURRENCES)
            .where(EVENT_OCCURRENCES.ID.eq(id))
            .fetchOptional(r -> new OccurrenceRow(
                r.get(EVENT_OCCURRENCES.ID),
                r.get(EVENT_OCCURRENCES.EVENT_ID),
                r.get(EVENT_OCCURRENCES.STARTS_AT),
                r.get(EVENT_OCCURRENCES.ENDS_AT),
                r.get(EVENT_OCCURRENCES.STATUS),
                r.get(EVENT_OCCURRENCES.STREAM_URL),
                r.get(EVENT_OCCURRENCES.CREATED_AT),
                r.get(EVENT_OCCURRENCES.UPDATED_AT)
            ));
    }

    public UUID create(UUID eventId, OffsetDateTime startsAt, OffsetDateTime endsAt, String streamUrl) {
        return dsl.insertInto(EVENT_OCCURRENCES)
            .set(EVENT_OCCURRENCES.EVENT_ID, eventId)
            .set(EVENT_OCCURRENCES.STARTS_AT, startsAt)
            .set(EVENT_OCCURRENCES.ENDS_AT, endsAt)
            .set(EVENT_OCCURRENCES.STREAM_URL, streamUrl)
            .returning(EVENT_OCCURRENCES.ID)
            .fetchOne()
            .getId();
    }

    public void deleteByEventId(UUID eventId) {
        dsl.deleteFrom(EVENT_OCCURRENCES)
            .where(EVENT_OCCURRENCES.EVENT_ID.eq(eventId))
            .execute();
    }

    public List<OccurrenceRow> findUpcoming() {
        return dsl.select(
                EVENT_OCCURRENCES.ID, EVENT_OCCURRENCES.EVENT_ID,
                EVENT_OCCURRENCES.STARTS_AT, EVENT_OCCURRENCES.ENDS_AT,
                EVENT_OCCURRENCES.STATUS, EVENT_OCCURRENCES.STREAM_URL,
                EVENT_OCCURRENCES.CREATED_AT, EVENT_OCCURRENCES.UPDATED_AT)
            .from(EVENT_OCCURRENCES)
            .where(EVENT_OCCURRENCES.STARTS_AT.gt(DSL.currentOffsetDateTime()))
            .and(EVENT_OCCURRENCES.STATUS.eq("SCHEDULED"))
            .orderBy(EVENT_OCCURRENCES.STARTS_AT.asc())
            .fetch(r -> new OccurrenceRow(
                r.get(EVENT_OCCURRENCES.ID),
                r.get(EVENT_OCCURRENCES.EVENT_ID),
                r.get(EVENT_OCCURRENCES.STARTS_AT),
                r.get(EVENT_OCCURRENCES.ENDS_AT),
                r.get(EVENT_OCCURRENCES.STATUS),
                r.get(EVENT_OCCURRENCES.STREAM_URL),
                r.get(EVENT_OCCURRENCES.CREATED_AT),
                r.get(EVENT_OCCURRENCES.UPDATED_AT)
            ));
    }
}
