package cz.samofujera.order.internal;

import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.ORDER_ITEMS;

@Repository
public class OrderItemRepository {

    private final DSLContext dsl;

    OrderItemRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record OrderItemRow(
        UUID id,
        UUID orderId,
        UUID productId,
        UUID variantId,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice,
        JSONB productSnapshot,
        OffsetDateTime createdAt
    ) {}

    public UUID create(UUID orderId, UUID productId, int quantity,
                       BigDecimal unitPrice, BigDecimal totalPrice, String productSnapshotJson) {
        return dsl.insertInto(ORDER_ITEMS)
            .set(ORDER_ITEMS.ORDER_ID, orderId)
            .set(ORDER_ITEMS.PRODUCT_ID, productId)
            .set(ORDER_ITEMS.QUANTITY, quantity)
            .set(ORDER_ITEMS.UNIT_PRICE, unitPrice)
            .set(ORDER_ITEMS.TOTAL_PRICE, totalPrice)
            .set(ORDER_ITEMS.PRODUCT_SNAPSHOT, JSONB.jsonb(productSnapshotJson))
            .returning(ORDER_ITEMS.ID)
            .fetchOne()
            .getId();
    }

    public List<OrderItemRow> findByOrderId(UUID orderId) {
        return dsl.select(
                ORDER_ITEMS.ID, ORDER_ITEMS.ORDER_ID, ORDER_ITEMS.PRODUCT_ID,
                ORDER_ITEMS.VARIANT_ID, ORDER_ITEMS.QUANTITY,
                ORDER_ITEMS.UNIT_PRICE, ORDER_ITEMS.TOTAL_PRICE,
                ORDER_ITEMS.PRODUCT_SNAPSHOT, ORDER_ITEMS.CREATED_AT)
            .from(ORDER_ITEMS)
            .where(ORDER_ITEMS.ORDER_ID.eq(orderId))
            .fetch(r -> new OrderItemRow(
                r.get(ORDER_ITEMS.ID),
                r.get(ORDER_ITEMS.ORDER_ID),
                r.get(ORDER_ITEMS.PRODUCT_ID),
                r.get(ORDER_ITEMS.VARIANT_ID),
                r.get(ORDER_ITEMS.QUANTITY),
                r.get(ORDER_ITEMS.UNIT_PRICE),
                r.get(ORDER_ITEMS.TOTAL_PRICE),
                r.get(ORDER_ITEMS.PRODUCT_SNAPSHOT),
                r.get(ORDER_ITEMS.CREATED_AT)
            ));
    }
}
