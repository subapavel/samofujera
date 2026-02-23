package cz.samofujera.entitlement.internal;

import cz.samofujera.entitlement.EntitlementService;
import cz.samofujera.order.event.OrderPaidEvent;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
class EntitlementListener {

    private final EntitlementService entitlementService;

    EntitlementListener(EntitlementService entitlementService) {
        this.entitlementService = entitlementService;
    }

    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        for (var item : event.items()) {
            entitlementService.grantProductAccess(
                event.userId(), item.productId(), "PURCHASE", event.orderId(),
                event.userEmail(), item.productTitle(), item.productType());
        }
    }
}
