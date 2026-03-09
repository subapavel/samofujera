package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.OrderEntity;
import cz.samofujera.domain.entity.OrderItemEntity;
import cz.samofujera.domain.entity.ProductEntity;
import cz.samofujera.domain.entity.ProductPriceEntity;
import cz.samofujera.domain.entity.ShippingRecordEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.security.Authenticated;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/orders")
@ApplicationScoped
@Authenticated
@Produces(MediaType.APPLICATION_JSON)
public class OrderCustomerResource {

    @Inject
    SecurityIdentity identity;

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<StubDtos.PaginatedResponse<OrderDtos.OrderListResponse>>>> getMyOrders(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit) {

        Long userId = identity.getAttribute("user_id");

        // Sequential: count first, then list, then enrich
        return OrderEntity.count("userId", userId)
                .chain(total -> OrderEntity.find("userId = ?1 ORDER BY createdAt DESC", userId)
                        .page(page - 1, limit).<OrderEntity>list()
                        .chain(orders -> {
                            if (orders.isEmpty()) {
                                return Uni.createFrom().item(RestResponse.ok(
                                        AuthDtos.ApiResponse.ok(new StubDtos.PaginatedResponse<>(
                                                List.of(), page, limit, total, 0))));
                            }

                            // Enrich each order with items sequentially
                            Uni<List<OrderDtos.OrderListResponse>> enriched = Uni.createFrom().item(
                                    new ArrayList<OrderDtos.OrderListResponse>());
                            for (OrderEntity order : orders) {
                                enriched = enriched.chain(list ->
                                        OrderItemEntity.findByOrderId(order.id)
                                                .map(items -> {
                                                    list.add(OrderDtos.OrderListResponse.from(order, items));
                                                    return list;
                                                }));
                            }

                            return enriched.map(responses -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(new StubDtos.PaginatedResponse<>(
                                            responses, page, limit, total,
                                            (int) Math.ceil((double) total / limit)))));
                        }));
    }

    @GET
    @Path("/{id}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<OrderDtos.OrderResponse>>> getMyOrder(@PathParam("id") UUID id) {
        Long userId = identity.getAttribute("user_id");

        return OrderEntity.<OrderEntity>findById(id)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(order -> {
                    if (order == null || !userId.equals(order.userId)) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<OrderDtos.OrderResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    // Sequential: items first, then shipping
                    return OrderItemEntity.findByOrderId(order.id)
                            .chain(items -> ShippingRecordEntity.findByOrderId(order.id)
                                    .map(shipping -> RestResponse.ok(AuthDtos.ApiResponse.ok(
                                            OrderDtos.OrderResponse.from(order, items, shipping)))));
                });
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<OrderDtos.OrderResponse>>> createOrder(
            OrderDtos.CreateOrderRequest request) {

        Long userId = identity.getAttribute("user_id");

        if (request == null || request.items() == null || request.items().isEmpty()) {
            return Uni.createFrom().item(
                    RestResponse.status(RestResponse.Status.BAD_REQUEST));
        }

        String currency = request.currency() != null ? request.currency() : "CZK";

        // Resolve prices sequentially
        Uni<List<ResolvedItem>> resolveChain = Uni.createFrom().item(new ArrayList<ResolvedItem>());
        for (OrderDtos.CheckoutItem item : request.items()) {
            resolveChain = resolveChain.chain(list ->
                    ProductPriceEntity.find(
                            "productId = ?1 AND currency = ?2", item.productId(), currency)
                            .<ProductPriceEntity>firstResult()
                            .map(price -> {
                                BigDecimal unitPrice = price != null ? price.amount : BigDecimal.ZERO;
                                int qty = Math.max(item.quantity(), 1);
                                list.add(new ResolvedItem(item, unitPrice, qty));
                                return list;
                            }));
        }

        return resolveChain
                .chain(resolvedItems -> {
                    BigDecimal totalAmount = resolvedItems.stream()
                            .map(ri -> ri.unitPrice.multiply(BigDecimal.valueOf(ri.quantity)))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    var order = new OrderEntity();
                    order.userId = userId;
                    order.totalAmount = totalAmount;
                    order.currency = currency;
                    order.billingAddress = request.billingAddress();
                    order.shippingAddress = request.shippingAddress();
                    order.locale = request.locale() != null ? request.locale() : "cs";

                    return order.<OrderEntity>persist()
                            .chain(savedOrder -> {
                                var itemEntities = new ArrayList<OrderItemEntity>();
                                for (var ri : resolvedItems) {
                                    var orderItem = new OrderItemEntity();
                                    orderItem.orderId = savedOrder.id;
                                    orderItem.productId = ri.item.productId();
                                    orderItem.variantId = ri.item.variantId();
                                    orderItem.quantity = ri.quantity;
                                    orderItem.unitPrice = ri.unitPrice;
                                    orderItem.totalPrice = ri.unitPrice.multiply(BigDecimal.valueOf(ri.quantity));
                                    itemEntities.add(orderItem);
                                }

                                return OrderItemEntity.persist(itemEntities)
                                        .map(v -> {
                                            var response = OrderDtos.OrderResponse.from(savedOrder, itemEntities, null);
                                            return RestResponse.status(RestResponse.Status.CREATED,
                                                    AuthDtos.ApiResponse.ok(response));
                                        });
                            });
                });
    }

    private record ResolvedItem(OrderDtos.CheckoutItem item, BigDecimal unitPrice, int quantity) {}
}
