package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.OrderEntity;
import cz.samofujera.domain.entity.OrderItemEntity;
import cz.samofujera.domain.entity.ShippingRecordEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Path("/api/admin/orders")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class OrderAdminResource {

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<StubDtos.PaginatedResponse<OrderDtos.OrderListResponse>>>> getOrders(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit,
            @QueryParam("status") String status) {

        Uni<Long> countUni;
        Uni<java.util.List<OrderEntity>> listUni;

        if (status != null && !status.isBlank()) {
            countUni = OrderEntity.count("status", status);
            listUni = OrderEntity.find("status = ?1 ORDER BY createdAt DESC", status)
                    .page(page - 1, limit).list();
        } else {
            countUni = OrderEntity.count();
            listUni = OrderEntity.find("ORDER BY createdAt DESC")
                    .page(page - 1, limit).list();
        }

        // Sequential: count first, then list, then enrich each order sequentially
        return countUni.chain(total -> listUni.chain(orders -> {
            if (orders.isEmpty()) {
                return Uni.createFrom().item(RestResponse.ok(
                        AuthDtos.ApiResponse.ok(new StubDtos.PaginatedResponse<>(
                                java.util.List.of(), page, limit, total,
                                (int) Math.ceil((double) total / limit)))));
            }

            // Enrich each order with items sequentially
            Uni<List<OrderDtos.OrderListResponse>> enriched = Uni.createFrom().item(
                    new java.util.ArrayList<OrderDtos.OrderListResponse>());
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
    public Uni<RestResponse<AuthDtos.ApiResponse<OrderDtos.OrderResponse>>> getOrder(@PathParam("id") UUID id) {
        return OrderEntity.<OrderEntity>findById(id)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(order -> {
                    if (order == null) {
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

    @PUT
    @Path("/{id}/shipping")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<OrderDtos.ShippingResponse>>> updateShipping(
            @PathParam("id") UUID id,
            @Valid OrderDtos.UpdateShippingRequest request) {

        return OrderEntity.<OrderEntity>findById(id)
                .onItem().ifNull().continueWith(() -> null)
                .onItem().transformToUni(order -> {
                    if (order == null) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<OrderDtos.ShippingResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }
                    return ShippingRecordEntity.findByOrderId(order.id)
                            .onItem().transformToUni(existing -> {
                                if (existing != null) {
                                    existing.carrier = request.carrier();
                                    existing.trackingNumber = request.trackingNumber();
                                    existing.trackingUrl = request.trackingUrl();
                                    if (existing.shippedAt == null) {
                                        existing.shippedAt = Instant.now();
                                    }
                                    return existing.<ShippingRecordEntity>persist()
                                            .onItem().transform(saved -> RestResponse.ok(
                                                    AuthDtos.ApiResponse.ok(OrderDtos.ShippingResponse.from(saved))));
                                } else {
                                    var shipping = new ShippingRecordEntity();
                                    shipping.orderId = order.id;
                                    shipping.carrier = request.carrier();
                                    shipping.trackingNumber = request.trackingNumber();
                                    shipping.trackingUrl = request.trackingUrl();
                                    shipping.shippedAt = Instant.now();
                                    return shipping.<ShippingRecordEntity>persist()
                                            .onItem().transform(saved -> RestResponse.ok(
                                                    AuthDtos.ApiResponse.ok(OrderDtos.ShippingResponse.from(saved))));
                                }
                            });
                });
    }
}
