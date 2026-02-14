package cz.samofujera.order.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.SHIPPING_RECORDS;

@Repository
public class ShippingRepository {

    private final DSLContext dsl;

    ShippingRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record ShippingRow(
        UUID id,
        UUID orderId,
        String carrier,
        String trackingNumber,
        String trackingUrl,
        OffsetDateTime shippedAt,
        OffsetDateTime deliveredAt,
        OffsetDateTime createdAt
    ) {}

    public Optional<ShippingRow> findByOrderId(UUID orderId) {
        return dsl.select(
                SHIPPING_RECORDS.ID, SHIPPING_RECORDS.ORDER_ID,
                SHIPPING_RECORDS.CARRIER, SHIPPING_RECORDS.TRACKING_NUMBER,
                SHIPPING_RECORDS.TRACKING_URL, SHIPPING_RECORDS.SHIPPED_AT,
                SHIPPING_RECORDS.DELIVERED_AT, SHIPPING_RECORDS.CREATED_AT)
            .from(SHIPPING_RECORDS)
            .where(SHIPPING_RECORDS.ORDER_ID.eq(orderId))
            .fetchOptional(r -> new ShippingRow(
                r.get(SHIPPING_RECORDS.ID),
                r.get(SHIPPING_RECORDS.ORDER_ID),
                r.get(SHIPPING_RECORDS.CARRIER),
                r.get(SHIPPING_RECORDS.TRACKING_NUMBER),
                r.get(SHIPPING_RECORDS.TRACKING_URL),
                r.get(SHIPPING_RECORDS.SHIPPED_AT),
                r.get(SHIPPING_RECORDS.DELIVERED_AT),
                r.get(SHIPPING_RECORDS.CREATED_AT)
            ));
    }

    public void upsert(UUID orderId, String carrier, String trackingNumber, String trackingUrl) {
        dsl.insertInto(SHIPPING_RECORDS)
            .set(SHIPPING_RECORDS.ORDER_ID, orderId)
            .set(SHIPPING_RECORDS.CARRIER, carrier)
            .set(SHIPPING_RECORDS.TRACKING_NUMBER, trackingNumber)
            .set(SHIPPING_RECORDS.TRACKING_URL, trackingUrl)
            .set(SHIPPING_RECORDS.SHIPPED_AT, OffsetDateTime.now())
            .onConflict(SHIPPING_RECORDS.ORDER_ID)
            .doUpdate()
            .set(SHIPPING_RECORDS.CARRIER, carrier)
            .set(SHIPPING_RECORDS.TRACKING_NUMBER, trackingNumber)
            .set(SHIPPING_RECORDS.TRACKING_URL, trackingUrl)
            .execute();
    }
}
