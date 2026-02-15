package cz.samofujera.delivery;

import java.util.List;
import java.util.UUID;

public final class DeliveryDtos {
    private DeliveryDtos() {}

    public record DownloadResponse(String downloadUrl, String fileName, long fileSize) {}

    public record StreamResponse(List<StreamItem> items) {}

    public record StreamItem(
        UUID id, String title, String mediaType, String cfStreamUid,
        Integer durationSeconds, int sortOrder
    ) {}

    public record EventAccessResponse(
        UUID eventId, String venue, Integer capacity, boolean isOnline,
        String streamUrl, List<OccurrenceItem> occurrences
    ) {}

    public record OccurrenceItem(
        UUID id, java.time.OffsetDateTime startsAt, java.time.OffsetDateTime endsAt,
        String status, String streamUrl
    ) {}
}
