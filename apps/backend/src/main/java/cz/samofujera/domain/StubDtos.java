package cz.samofujera.domain;

import java.util.List;

/**
 * Shared DTOs for stub endpoints.
 * Will be replaced with real DTOs when modules are implemented.
 */
public final class StubDtos {
    private StubDtos() {}

    public record PaginatedResponse<T>(
            List<T> items,
            int page,
            int limit,
            long totalItems,
            int totalPages
    ) {
        public static <T> PaginatedResponse<T> empty(int page, int limit) {
            return new PaginatedResponse<>(List.of(), page, limit, 0, 0);
        }
    }
}
