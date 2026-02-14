package cz.samofujera.payment;

import cz.samofujera.auth.UserPrincipal;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    private final PaymentService paymentService;

    CheckoutController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PaymentDtos.CheckoutResponse>> createCheckout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PaymentDtos.CheckoutRequest request) {
        var result = paymentService.createCheckout(
            principal.getId(),
            principal.getUsername(),
            principal.getName(),
            request.items()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(result));
    }
}
