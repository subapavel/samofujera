package cz.samofujera.catalog.internal;

import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Duration;

@Service
public class R2StorageService {

    private final StorageService storageService;

    R2StorageService(StorageService storageService) {
        this.storageService = storageService;
    }

    public void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        storageService.upload(key, inputStream, contentLength, contentType);
    }

    public void delete(String key) {
        storageService.delete(key);
    }

    public String generatePresignedUrl(String key, Duration ttl) {
        return storageService.generatePresignedUrl(key, ttl);
    }
}
