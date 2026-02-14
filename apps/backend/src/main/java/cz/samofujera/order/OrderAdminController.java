package cz.samofujera.order;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/orders")
public class OrderAdminController {

    private final OrderService orderService;

    OrderAdminController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<OrderDtos.OrderListResponse>> getAllOrders(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        var result = orderService.getAllOrders(status, page, limit);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDtos.OrderResponse>> getOrderDetail(
            @PathVariable UUID id) {
        var result = orderService.getOrderDetail(id);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/{id}/shipping")
    public ResponseEntity<ApiResponse<OrderDtos.ShippingResponse>> updateShipping(
            @PathVariable UUID id,
            @Valid @RequestBody OrderDtos.UpdateShippingRequest request) {
        var result = orderService.updateShipping(id, request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
