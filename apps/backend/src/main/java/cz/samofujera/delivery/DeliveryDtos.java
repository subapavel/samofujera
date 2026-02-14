package cz.samofujera.delivery;

public final class DeliveryDtos {
    private DeliveryDtos() {}

    public record DownloadResponse(String downloadUrl, String fileName, long fileSize) {}
}
