package cz.samofujera.order.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.ORDERS;

@Repository
public class OrderRepository {

    private final DSLContext dsl;

    OrderRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record OrderRow(
        UUID id,
        UUID userId,
        String status,
        BigDecimal totalAmount,
        String currency,
        UUID voucherId,
        BigDecimal discountAmount,
        String stripePaymentId,
        String stripeInvoiceId,
        String locale,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public UUID create(UUID userId, BigDecimal totalAmount, String currency, String locale) {
        return dsl.insertInto(ORDERS)
            .set(ORDERS.USER_ID, userId)
            .set(ORDERS.TOTAL_AMOUNT, totalAmount)
            .set(ORDERS.CURRENCY, currency != null ? currency : "CZK")
            .set(ORDERS.LOCALE, locale != null ? locale : "cs")
            .returning(ORDERS.ID)
            .fetchOne()
            .getId();
    }

    public Optional<OrderRow> findById(UUID id) {
        return dsl.select(
                ORDERS.ID, ORDERS.USER_ID, ORDERS.STATUS, ORDERS.TOTAL_AMOUNT,
                ORDERS.CURRENCY, ORDERS.VOUCHER_ID, ORDERS.DISCOUNT_AMOUNT,
                ORDERS.STRIPE_PAYMENT_ID, ORDERS.STRIPE_INVOICE_ID,
                ORDERS.LOCALE, ORDERS.CREATED_AT, ORDERS.UPDATED_AT)
            .from(ORDERS)
            .where(ORDERS.ID.eq(id))
            .fetchOptional(r -> new OrderRow(
                r.get(ORDERS.ID),
                r.get(ORDERS.USER_ID),
                r.get(ORDERS.STATUS),
                r.get(ORDERS.TOTAL_AMOUNT),
                r.get(ORDERS.CURRENCY),
                r.get(ORDERS.VOUCHER_ID),
                r.get(ORDERS.DISCOUNT_AMOUNT),
                r.get(ORDERS.STRIPE_PAYMENT_ID),
                r.get(ORDERS.STRIPE_INVOICE_ID),
                r.get(ORDERS.LOCALE),
                r.get(ORDERS.CREATED_AT),
                r.get(ORDERS.UPDATED_AT)
            ));
    }

    public List<OrderRow> findByUserId(UUID userId, int offset, int limit) {
        return dsl.select(
                ORDERS.ID, ORDERS.USER_ID, ORDERS.STATUS, ORDERS.TOTAL_AMOUNT,
                ORDERS.CURRENCY, ORDERS.VOUCHER_ID, ORDERS.DISCOUNT_AMOUNT,
                ORDERS.STRIPE_PAYMENT_ID, ORDERS.STRIPE_INVOICE_ID,
                ORDERS.LOCALE, ORDERS.CREATED_AT, ORDERS.UPDATED_AT)
            .from(ORDERS)
            .where(ORDERS.USER_ID.eq(userId))
            .orderBy(ORDERS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(r -> new OrderRow(
                r.get(ORDERS.ID),
                r.get(ORDERS.USER_ID),
                r.get(ORDERS.STATUS),
                r.get(ORDERS.TOTAL_AMOUNT),
                r.get(ORDERS.CURRENCY),
                r.get(ORDERS.VOUCHER_ID),
                r.get(ORDERS.DISCOUNT_AMOUNT),
                r.get(ORDERS.STRIPE_PAYMENT_ID),
                r.get(ORDERS.STRIPE_INVOICE_ID),
                r.get(ORDERS.LOCALE),
                r.get(ORDERS.CREATED_AT),
                r.get(ORDERS.UPDATED_AT)
            ));
    }

    public long countByUserId(UUID userId) {
        return dsl.selectCount()
            .from(ORDERS)
            .where(ORDERS.USER_ID.eq(userId))
            .fetchOne(0, long.class);
    }

    public List<OrderRow> findAll(String status, int offset, int limit) {
        Condition condition = DSL.trueCondition();
        if (status != null && !status.isBlank()) {
            condition = condition.and(ORDERS.STATUS.eq(status));
        }

        return dsl.select(
                ORDERS.ID, ORDERS.USER_ID, ORDERS.STATUS, ORDERS.TOTAL_AMOUNT,
                ORDERS.CURRENCY, ORDERS.VOUCHER_ID, ORDERS.DISCOUNT_AMOUNT,
                ORDERS.STRIPE_PAYMENT_ID, ORDERS.STRIPE_INVOICE_ID,
                ORDERS.LOCALE, ORDERS.CREATED_AT, ORDERS.UPDATED_AT)
            .from(ORDERS)
            .where(condition)
            .orderBy(ORDERS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(r -> new OrderRow(
                r.get(ORDERS.ID),
                r.get(ORDERS.USER_ID),
                r.get(ORDERS.STATUS),
                r.get(ORDERS.TOTAL_AMOUNT),
                r.get(ORDERS.CURRENCY),
                r.get(ORDERS.VOUCHER_ID),
                r.get(ORDERS.DISCOUNT_AMOUNT),
                r.get(ORDERS.STRIPE_PAYMENT_ID),
                r.get(ORDERS.STRIPE_INVOICE_ID),
                r.get(ORDERS.LOCALE),
                r.get(ORDERS.CREATED_AT),
                r.get(ORDERS.UPDATED_AT)
            ));
    }

    public long count(String status) {
        Condition condition = DSL.trueCondition();
        if (status != null && !status.isBlank()) {
            condition = condition.and(ORDERS.STATUS.eq(status));
        }

        return dsl.selectCount()
            .from(ORDERS)
            .where(condition)
            .fetchOne(0, long.class);
    }

    public void updateStatus(UUID id, String status, String stripePaymentId) {
        var step = dsl.update(ORDERS)
            .set(ORDERS.STATUS, status)
            .set(ORDERS.UPDATED_AT, OffsetDateTime.now());

        if (stripePaymentId != null) {
            step.set(ORDERS.STRIPE_PAYMENT_ID, stripePaymentId);
        }

        step.where(ORDERS.ID.eq(id))
            .execute();
    }
}
