package cz.samofujera.domain;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@ApplicationScoped
public class LocalStorageService {

    @ConfigProperty(name = "app.storage.local-dir", defaultValue = "uploads")
    String localDir;

    @ConfigProperty(name = "app.storage.base-url", defaultValue = "http://localhost:8080")
    String baseUrl;

    public String store(UUID imageId, String originalFilename, InputStream data) throws IOException {
        String ext = "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot >= 0) {
            ext = originalFilename.substring(dot);
        }
        String storageKey = "images/" + imageId + "/original" + ext;

        Path filePath = Path.of(localDir, storageKey);
        Files.createDirectories(filePath.getParent());
        Files.copy(data, filePath);
        return storageKey;
    }

    public String getUrl(String storageKey) {
        if (storageKey == null) return null;
        return baseUrl + "/api/files/" + storageKey;
    }

    public Path resolve(String storageKey) {
        return Path.of(localDir, storageKey);
    }
}
