---
name: spring-modulith-conventions
description: "Spring Modulith module boundary and event-driven communication patterns. Use when working on backend Java modules, creating services, publishing events, or writing module integration tests."
user-invocable: false
---

# Spring Modulith Conventions

## MANDATORY: Check Context7 First
Before using ANY Spring Modulith API, use the Context7 MCP tool to look up the
current Spring Modulith 2 documentation. Verify annotations, test APIs, and event
patterns against the latest docs.

## Module Structure
Every module follows this package layout:
```
cz.samofujera.<module>/
├── <Module>Service.java           # Public API (other modules call this)
├── <Module>Record.java            # Public DTO (Java record)
├── internal/
│   ├── <Entity>Repository.java    # JOOQ DAO (package-private)
│   └── <Impl>Service.java         # Internal logic (package-private)
└── event/
    ├── <Entity>CreatedEvent.java  # Domain event (public record)
    └── <Entity>UpdatedEvent.java
```

## Sacred Rules
1. **Module boundaries are absolute** — never access another module's `internal/` package
2. **Cross-module communication only through:**
   - Public service methods (synchronous)
   - Application events (asynchronous, preferred)
3. **Events are Java records** — immutable, serializable
4. **Public API = classes at module root** — Service + Records only
5. **Internal = everything in `internal/`** — repositories, implementation details
6. **Sub-packages need `@NamedInterface`** — expose `event/` or other sub-packages with
   `@NamedInterface("events")` in `package-info.java` so other modules can access them
7. **Avoid bean name conflicts** — don't name classes the same as Spring framework beans
   (e.g. use `UserSessionRepository` not `SessionRepository` to avoid Spring Session conflict)
8. **@Transactional on event publishers** — methods that call `publishEvent()` must be
   `@Transactional` for `@ApplicationModuleListener` handlers to fire

## Event Publishing
```java
// In the publishing module's service:
// CRITICAL: Method MUST be @Transactional — @ApplicationModuleListener uses
// @TransactionalEventListener which only fires AFTER transaction commit.
// Without @Transactional, events are published but listeners never fire.
private final ApplicationEventPublisher events;

@Transactional
public void completeOrder(UUID orderId) {
    // ... business logic ...
    events.publishEvent(new OrderPaidEvent(orderId, userId));
}
```

## Event Handling
```java
// In the consuming module's internal package:
@Component
class EntitlementEventHandler {

    @ApplicationModuleListener
    void on(OrderPaidEvent event) {
        // Grant entitlement...
    }
}
```

## Module Testing
```java
@ApplicationModuleTest
class OrderModuleIntegrationTest {

    @Test
    void verifyModuleStructure(ApplicationModules modules) {
        modules.verify();
    }

    @Test
    void whenOrderPaid_thenEventPublished(Scenario scenario) {
        scenario.stimulate(() -> orderService.pay(orderId))
                .andWaitForEventOfType(OrderPaidEvent.class)
                .toArriveAndVerify(event ->
                    assertThat(event.orderId()).isEqualTo(orderId));
    }
}
```

## Architecture Verification
Run this test to verify ALL module boundaries:
```java
@Test
void verifyAllModules() {
    ApplicationModules.of(SamoFujeraApplication.class).verify();
}
```
