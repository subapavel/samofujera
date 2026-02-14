package cz.samofujera.order;

import cz.samofujera.catalog.CatalogDtos;
import cz.samofujera.catalog.CatalogService;
import cz.samofujera.order.event.OrderPaidEvent;
import cz.samofujera.order.internal.OrderItemRepository;
import cz.samofujera.order.internal.OrderRepository;
import cz.samofujera.order.internal.ShippingRepository;
import cz.samofujera.shared.exception.NotFoundException;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShippingRepository shippingRepository;
    private final CatalogService catalogService;
    private final ApplicationEventPublisher eventPublisher;

    OrderService(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                 ShippingRepository shippingRepository, CatalogService catalogService,
                 ApplicationEventPublisher eventPublisher) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.shippingRepository = shippingRepository;
        this.catalogService = catalogService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public OrderDtos.OrderResponse createOrder(UUID userId, List<OrderDtos.CheckoutItem> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one item");
        }

        // Look up each product and calculate total
        BigDecimal totalAmount = BigDecimal.ZERO;

        record ResolvedItem(CatalogDtos.ProductResponse product, int quantity,
                            BigDecimal unitPrice, BigDecimal lineTotal) {}

        var resolvedItems = new java.util.ArrayList<ResolvedItem>();

        for (var item : items) {
            var product = catalogService.getProductById(item.productId());
            if (!"ACTIVE".equals(product.status())) {
                throw new IllegalArgumentException("Product '" + product.title() + "' is not available for purchase");
            }
            var unitPrice = product.priceAmount();
            var lineTotal = unitPrice.multiply(BigDecimal.valueOf(item.quantity()));
            totalAmount = totalAmount.add(lineTotal);
            resolvedItems.add(new ResolvedItem(product, item.quantity(), unitPrice, lineTotal));
        }

        // Create order
        var orderId = orderRepository.create(userId, totalAmount, "CZK", "cs");

        // Create order items with product snapshots
        for (var resolved : resolvedItems) {
            var snapshot = buildProductSnapshot(resolved.product());
            orderItemRepository.create(
                orderId,
                resolved.product().id(),
                resolved.quantity(),
                resolved.unitPrice(),
                resolved.lineTotal(),
                snapshot
            );
        }

        return getOrderById(orderId);
    }

    @Transactional
    public void markAsPaid(UUID orderId, String stripePaymentId,
                           String userEmail, String userName) {
        var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found"));

        orderRepository.updateStatus(orderId, "PAID", stripePaymentId);

        // Build event items from order items
        var orderItems = orderItemRepository.findByOrderId(orderId);
        var eventItems = orderItems.stream()
            .map(item -> {
                var snapshot = item.productSnapshot().data();
                var title = extractJsonField(snapshot, "title");
                var type = extractJsonField(snapshot, "productType");
                return new OrderPaidEvent.OrderItem(
                    item.productId(), title, type, item.quantity()
                );
            })
            .toList();

        eventPublisher.publishEvent(new OrderPaidEvent(
            orderId,
            order.userId(),
            userEmail,
            userName,
            order.totalAmount(),
            order.currency(),
            eventItems
        ));
    }

    public OrderDtos.OrderListResponse getMyOrders(UUID userId, int page, int limit) {
        int offset = (page - 1) * limit;
        var orders = orderRepository.findByUserId(userId, offset, limit);
        long totalItems = orderRepository.countByUserId(userId);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = orders.stream()
            .map(order -> toOrderResponse(order, true))
            .toList();

        return new OrderDtos.OrderListResponse(responses, page, limit, totalItems, totalPages);
    }

    public OrderDtos.OrderResponse getOrder(UUID userId, UUID orderId) {
        var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found"));

        if (!order.userId().equals(userId)) {
            throw new NotFoundException("Order not found");
        }

        return toOrderResponse(order, true);
    }

    public OrderDtos.OrderListResponse getAllOrders(String status, int page, int limit) {
        int offset = (page - 1) * limit;
        var orders = orderRepository.findAll(status, offset, limit);
        long totalItems = orderRepository.count(status);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = orders.stream()
            .map(order -> toOrderResponse(order, true))
            .toList();

        return new OrderDtos.OrderListResponse(responses, page, limit, totalItems, totalPages);
    }

    public OrderDtos.OrderResponse getOrderDetail(UUID orderId) {
        var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found"));
        return toOrderResponse(order, true);
    }

    @Transactional
    public OrderDtos.ShippingResponse updateShipping(UUID orderId,
                                                      OrderDtos.UpdateShippingRequest request) {
        orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found"));

        shippingRepository.upsert(orderId, request.carrier(),
            request.trackingNumber(), request.trackingUrl());

        var shipping = shippingRepository.findByOrderId(orderId)
            .orElseThrow(() -> new NotFoundException("Shipping record not found"));

        return toShippingResponse(shipping);
    }

    private OrderDtos.OrderResponse getOrderById(UUID orderId) {
        var order = orderRepository.findById(orderId)
            .orElseThrow(() -> new NotFoundException("Order not found"));
        return toOrderResponse(order, true);
    }

    private OrderDtos.OrderResponse toOrderResponse(OrderRepository.OrderRow order,
                                                      boolean includeItems) {
        List<OrderDtos.OrderItemResponse> itemResponses = List.of();
        if (includeItems) {
            var items = orderItemRepository.findByOrderId(order.id());
            itemResponses = items.stream()
                .map(this::toOrderItemResponse)
                .toList();
        }

        var shipping = shippingRepository.findByOrderId(order.id())
            .map(this::toShippingResponse)
            .orElse(null);

        return new OrderDtos.OrderResponse(
            order.id(),
            order.status(),
            order.totalAmount(),
            order.currency(),
            order.discountAmount(),
            itemResponses,
            shipping,
            order.createdAt()
        );
    }

    private OrderDtos.OrderItemResponse toOrderItemResponse(OrderItemRepository.OrderItemRow item) {
        var snapshot = item.productSnapshot().data();
        var title = extractJsonField(snapshot, "title");
        var type = extractJsonField(snapshot, "productType");
        var thumbnailUrl = extractJsonField(snapshot, "thumbnailUrl");

        return new OrderDtos.OrderItemResponse(
            item.id(),
            item.productId(),
            title,
            type,
            item.quantity(),
            item.unitPrice(),
            item.totalPrice(),
            thumbnailUrl
        );
    }

    private OrderDtos.ShippingResponse toShippingResponse(ShippingRepository.ShippingRow row) {
        return new OrderDtos.ShippingResponse(
            row.carrier(),
            row.trackingNumber(),
            row.trackingUrl(),
            row.shippedAt(),
            row.deliveredAt()
        );
    }

    private String buildProductSnapshot(CatalogDtos.ProductResponse product) {
        var thumbnailValue = product.thumbnailUrl() != null
            ? "\"" + escapeJson(product.thumbnailUrl()) + "\""
            : "null";
        return "{\"title\":\"" + escapeJson(product.title())
            + "\",\"productType\":\"" + escapeJson(product.productType())
            + "\",\"priceAmount\":" + product.priceAmount().toPlainString()
            + ",\"priceCurrency\":\"" + escapeJson(product.priceCurrency())
            + "\",\"thumbnailUrl\":" + thumbnailValue + "}";
    }

    private String extractJsonField(String json, String field) {
        var key = "\"" + field + "\":";
        int idx = json.indexOf(key);
        if (idx < 0) {
            return null;
        }
        int valueStart = idx + key.length();
        // Skip whitespace (PostgreSQL JSONB adds spaces after colons)
        while (valueStart < json.length() && json.charAt(valueStart) == ' ') {
            valueStart++;
        }
        if (valueStart >= json.length()) {
            return null;
        }
        if (json.charAt(valueStart) == '"') {
            int end = json.indexOf('"', valueStart + 1);
            return end > 0 ? json.substring(valueStart + 1, end) : null;
        }
        if (json.startsWith("null", valueStart)) {
            return null;
        }
        int end = valueStart;
        while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') {
            end++;
        }
        return json.substring(valueStart, end);
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
