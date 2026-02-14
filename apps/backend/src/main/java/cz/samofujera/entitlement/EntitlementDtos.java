package cz.samofujera.entitlement;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class EntitlementDtos {
    private EntitlementDtos() {}

    public record LibraryItem(
        UUID productId,
        String productTitle,
        String productType,
        String thumbnailUrl,
        OffsetDateTime grantedAt
    ) {}
}
