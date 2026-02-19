# Media Library & Admin Categories UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized media library module (backend + frontend), replace dialog-based category CRUD with full-page routes, and add drag-to-reorder for categories.

**Architecture:** New Spring Modulith `media` module with R2 storage, folder-based organization, temp upload flow. Frontend: standalone media management page, reusable MediaPicker dialog. Categories move under `/produkty/kategorie/` routes with dnd-kit sortable list.

**Tech Stack:** Java 25, Spring Boot 4, JOOQ, Cloudflare R2, React 19, dnd-kit, TanStack Router/Query, shadcn/ui

---

## Task 1: Database Migration — Media Tables + Category Schema Change

**Files:**
- Create: `apps/backend/src/main/resources/db/migration/V18__media_library_and_category_update.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- V18: Media library tables + category image FK migration
-- ============================================================

-- 1. Media folders (logical folder hierarchy)
CREATE TABLE media_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES media_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(parent_folder_id, slug)
);

-- 2. Media items (files stored in R2)
CREATE TABLE media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES media_folders(id) ON DELETE SET NULL,
    original_filename VARCHAR(500) NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    width INT,
    height INT,
    alt_text VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_items_folder ON media_items(folder_id);
CREATE INDEX idx_media_items_mime ON media_items(mime_type);

-- 3. Add image_media_id FK to product_categories
ALTER TABLE product_categories ADD COLUMN image_media_id UUID REFERENCES media_items(id) ON DELETE SET NULL;

-- 4. Drop old image_url column (no data to migrate — categories have no images yet)
ALTER TABLE product_categories DROP COLUMN image_url;
```

**Step 2: Regenerate JOOQ classes**

Run: `cd apps/backend && ./mvnw clean compile -pl . -DskipTests`

Verify: New generated classes appear for `media_folders`, `media_items`, and `product_categories` now has `image_media_id` instead of `image_url`.

**Step 3: Commit**

```bash
git add apps/backend/src/main/resources/db/migration/V18__media_library_and_category_update.sql
git commit -m "feat(backend): add media library tables and category image fk migration"
```

---

## Task 2: Media Module Backend — Repository Layer

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/media/internal/MediaFolderRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/media/internal/MediaItemRepository.java`
- Create: `apps/backend/src/main/java/cz/samofujera/media/internal/package-info.java`

**Step 1: Create module boundary marker**

```java
// apps/backend/src/main/java/cz/samofujera/media/internal/package-info.java
@org.springframework.modulith.ApplicationModule(allowedDependencies = {})
package cz.samofujera.media.internal;
```

**Step 2: Write MediaFolderRepository**

```java
package cz.samofujera.media.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.MEDIA_FOLDERS;

@Repository
public class MediaFolderRepository {

    private final DSLContext dsl;

    MediaFolderRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record FolderRow(UUID id, String name, String slug, UUID parentFolderId, OffsetDateTime createdAt) {}

    public List<FolderRow> findAll() {
        return dsl.selectFrom(MEDIA_FOLDERS)
            .orderBy(MEDIA_FOLDERS.NAME.asc())
            .fetch(r -> new FolderRow(
                r.getId(), r.getName(), r.getSlug(), r.getParentFolderId(), r.getCreatedAt()
            ));
    }

    public Optional<FolderRow> findById(UUID id) {
        return dsl.selectFrom(MEDIA_FOLDERS)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .fetchOptional(r -> new FolderRow(
                r.getId(), r.getName(), r.getSlug(), r.getParentFolderId(), r.getCreatedAt()
            ));
    }

    public UUID create(String name, String slug, UUID parentFolderId) {
        return dsl.insertInto(MEDIA_FOLDERS)
            .set(MEDIA_FOLDERS.NAME, name)
            .set(MEDIA_FOLDERS.SLUG, slug)
            .set(MEDIA_FOLDERS.PARENT_FOLDER_ID, parentFolderId)
            .returning(MEDIA_FOLDERS.ID)
            .fetchOne()
            .getId();
    }

    public void rename(UUID id, String name, String slug) {
        dsl.update(MEDIA_FOLDERS)
            .set(MEDIA_FOLDERS.NAME, name)
            .set(MEDIA_FOLDERS.SLUG, slug)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(MEDIA_FOLDERS)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .execute();
    }

    public boolean hasChildren(UUID id) {
        return dsl.fetchExists(
            dsl.selectFrom(MEDIA_FOLDERS)
                .where(MEDIA_FOLDERS.PARENT_FOLDER_ID.eq(id))
        );
    }
}
```

**Step 3: Write MediaItemRepository**

```java
package cz.samofujera.media.internal;

import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.MEDIA_ITEMS;

@Repository
public class MediaItemRepository {

    private final DSLContext dsl;

    MediaItemRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record MediaItemRow(
        UUID id, UUID folderId, String originalFilename, String storageKey,
        String mimeType, long fileSizeBytes, Integer width, Integer height,
        String altText, OffsetDateTime createdAt, OffsetDateTime updatedAt
    ) {}

    public List<MediaItemRow> findAll(UUID folderId, String mimeTypePrefix, String search, int offset, int limit) {
        var conditions = new ArrayList<Condition>();

        if (folderId != null) {
            conditions.add(MEDIA_ITEMS.FOLDER_ID.eq(folderId));
        }
        if (mimeTypePrefix != null && !mimeTypePrefix.isBlank()) {
            conditions.add(MEDIA_ITEMS.MIME_TYPE.startsWith(mimeTypePrefix));
        }
        if (search != null && !search.isBlank()) {
            conditions.add(MEDIA_ITEMS.ORIGINAL_FILENAME.containsIgnoreCase(search));
        }

        var where = conditions.isEmpty() ? DSL.trueCondition() : DSL.and(conditions);

        return dsl.selectFrom(MEDIA_ITEMS)
            .where(where)
            .orderBy(MEDIA_ITEMS.CREATED_AT.desc())
            .offset(offset)
            .limit(limit)
            .fetch(this::toRow);
    }

    public long count(UUID folderId, String mimeTypePrefix, String search) {
        var conditions = new ArrayList<Condition>();

        if (folderId != null) {
            conditions.add(MEDIA_ITEMS.FOLDER_ID.eq(folderId));
        }
        if (mimeTypePrefix != null && !mimeTypePrefix.isBlank()) {
            conditions.add(MEDIA_ITEMS.MIME_TYPE.startsWith(mimeTypePrefix));
        }
        if (search != null && !search.isBlank()) {
            conditions.add(MEDIA_ITEMS.ORIGINAL_FILENAME.containsIgnoreCase(search));
        }

        var where = conditions.isEmpty() ? DSL.trueCondition() : DSL.and(conditions);

        return dsl.selectCount()
            .from(MEDIA_ITEMS)
            .where(where)
            .fetchOne(0, long.class);
    }

    public Optional<MediaItemRow> findById(UUID id) {
        return dsl.selectFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.ID.eq(id))
            .fetchOptional(this::toRow);
    }

    public UUID create(UUID folderId, String originalFilename, String storageKey,
                       String mimeType, long fileSizeBytes, Integer width, Integer height, String altText) {
        return dsl.insertInto(MEDIA_ITEMS)
            .set(MEDIA_ITEMS.FOLDER_ID, folderId)
            .set(MEDIA_ITEMS.ORIGINAL_FILENAME, originalFilename)
            .set(MEDIA_ITEMS.STORAGE_KEY, storageKey)
            .set(MEDIA_ITEMS.MIME_TYPE, mimeType)
            .set(MEDIA_ITEMS.FILE_SIZE_BYTES, fileSizeBytes)
            .set(MEDIA_ITEMS.WIDTH, width)
            .set(MEDIA_ITEMS.HEIGHT, height)
            .set(MEDIA_ITEMS.ALT_TEXT, altText)
            .returning(MEDIA_ITEMS.ID)
            .fetchOne()
            .getId();
    }

    public void update(UUID id, String altText, UUID folderId) {
        dsl.update(MEDIA_ITEMS)
            .set(MEDIA_ITEMS.ALT_TEXT, altText)
            .set(MEDIA_ITEMS.FOLDER_ID, folderId)
            .set(MEDIA_ITEMS.UPDATED_AT, OffsetDateTime.now())
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.ID.eq(id))
            .execute();
    }

    public List<MediaItemRow> findByStorageKeyPrefix(String prefix) {
        return dsl.selectFrom(MEDIA_ITEMS)
            .where(MEDIA_ITEMS.STORAGE_KEY.startsWith(prefix))
            .fetch(this::toRow);
    }

    private MediaItemRow toRow(org.jooq.Record r) {
        var rec = r.into(MEDIA_ITEMS);
        return new MediaItemRow(
            rec.getId(), rec.getFolderId(), rec.getOriginalFilename(), rec.getStorageKey(),
            rec.getMimeType(), rec.getFileSizeBytes(), rec.getWidth(), rec.getHeight(),
            rec.getAltText(), rec.getCreatedAt(), rec.getUpdatedAt()
        );
    }
}
```

**Step 4: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/media/
git commit -m "feat(backend): add media module repository layer"
```

---

## Task 3: Media Module Backend — Service + Public API

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/media/MediaDtos.java`
- Create: `apps/backend/src/main/java/cz/samofujera/media/MediaService.java`

**Step 1: Write MediaDtos (public API records)**

```java
package cz.samofujera.media;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class MediaDtos {
    private MediaDtos() {}

    // Responses

    public record MediaItemResponse(
        UUID id, String originalFilename, String url,
        String mimeType, long fileSizeBytes, Integer width, Integer height,
        String altText, UUID folderId, OffsetDateTime createdAt
    ) {}

    public record TempUploadResponse(String tempKey, String previewUrl) {}

    public record FolderResponse(UUID id, String name, String slug, UUID parentFolderId, OffsetDateTime createdAt) {}

    public record MediaItemListResponse(
        java.util.List<MediaItemResponse> items, int page, int limit, long totalItems, int totalPages
    ) {}

    // Requests

    public record CreateFolderRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug,
        UUID parentFolderId
    ) {}

    public record RenameFolderRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Size(max = 255) String slug
    ) {}

    public record CreateMediaItemRequest(
        @NotBlank String tempKey,
        UUID folderId,
        @Size(max = 500) String altText
    ) {}

    public record UpdateMediaItemRequest(
        @Size(max = 500) String altText,
        UUID folderId
    ) {}
}
```

**Step 2: Write MediaService**

The service needs access to R2. Since R2StorageService is in `catalog.internal`, we need to extract a shared storage service or duplicate. The cleanest approach: move R2 storage to a `shared` or `storage` infrastructure bean. However, to minimize scope, we'll create a new R2StorageService in the media module that reads the same config.

Actually, looking at the codebase, the simplest approach is to make the media module have its own storage service instance (same config, separate bean). But that's wasteful. Better: extract R2StorageService to a `shared` infrastructure module or make it a standalone `@Component` that both modules can use.

**Decision:** Create a shared `cz.samofujera.shared.storage.StorageService` that both modules can use. Move the R2 logic there, and update catalog to use it.

- Create: `apps/backend/src/main/java/cz/samofujera/shared/storage/StorageService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/R2StorageService.java` — delegate to shared StorageService
- Create: `apps/backend/src/main/java/cz/samofujera/media/MediaService.java`

```java
// apps/backend/src/main/java/cz/samofujera/shared/storage/StorageService.java
package cz.samofujera.shared.storage;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.List;

@Service
public class StorageService {

    @Value("${r2.endpoint}")
    private String endpoint;

    @Value("${r2.access-key}")
    private String accessKey;

    @Value("${r2.secret-key}")
    private String secretKey;

    @Value("${r2.bucket}")
    private String bucket;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    void init() {
        var credentials = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey, secretKey));

        this.s3Client = S3Client.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .forcePathStyle(true)
            .build();

        this.presigner = S3Presigner.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(credentials)
            .region(Region.of("auto"))
            .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
            .build();
    }

    @PreDestroy
    void destroy() {
        if (s3Client != null) s3Client.close();
        if (presigner != null) presigner.close();
    }

    public void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        var request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .contentLength(contentLength)
            .build();
        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
    }

    public void copy(String sourceKey, String destinationKey) {
        var request = CopyObjectRequest.builder()
            .sourceBucket(bucket)
            .sourceKey(sourceKey)
            .destinationBucket(bucket)
            .destinationKey(destinationKey)
            .build();
        s3Client.copyObject(request);
    }

    public void delete(String key) {
        var request = DeleteObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();
        s3Client.deleteObject(request);
    }

    public String generatePresignedUrl(String key, Duration ttl) {
        var getObjectRequest = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build();
        var presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(ttl)
            .getObjectRequest(getObjectRequest)
            .build();
        return presigner.presignGetObject(presignRequest).url().toExternalForm();
    }

    public List<String> listKeys(String prefix) {
        var request = ListObjectsV2Request.builder()
            .bucket(bucket)
            .prefix(prefix)
            .build();
        return s3Client.listObjectsV2(request).contents().stream()
            .map(S3Object::key)
            .toList();
    }
}
```

Then update `R2StorageService` to delegate:

```java
// apps/backend/src/main/java/cz/samofujera/catalog/internal/R2StorageService.java
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
```

Now write MediaService:

```java
// apps/backend/src/main/java/cz/samofujera/media/MediaService.java
package cz.samofujera.media;

import cz.samofujera.media.internal.MediaFolderRepository;
import cz.samofujera.media.internal.MediaItemRepository;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.shared.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class MediaService {

    private static final Duration URL_TTL = Duration.ofHours(1);

    private final MediaFolderRepository folderRepository;
    private final MediaItemRepository itemRepository;
    private final StorageService storageService;

    MediaService(MediaFolderRepository folderRepository, MediaItemRepository itemRepository,
                 StorageService storageService) {
        this.folderRepository = folderRepository;
        this.itemRepository = itemRepository;
        this.storageService = storageService;
    }

    // --- Folder operations ---

    public List<MediaDtos.FolderResponse> getFolders() {
        return folderRepository.findAll().stream()
            .map(f -> new MediaDtos.FolderResponse(f.id(), f.name(), f.slug(), f.parentFolderId(), f.createdAt()))
            .toList();
    }

    @Transactional
    public MediaDtos.FolderResponse createFolder(MediaDtos.CreateFolderRequest request) {
        var id = folderRepository.create(request.name(), request.slug(), request.parentFolderId());
        var folder = folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        return new MediaDtos.FolderResponse(folder.id(), folder.name(), folder.slug(), folder.parentFolderId(), folder.createdAt());
    }

    @Transactional
    public MediaDtos.FolderResponse renameFolder(UUID id, MediaDtos.RenameFolderRequest request) {
        folderRepository.findById(id).orElseThrow(() -> new NotFoundException("Folder not found"));
        folderRepository.rename(id, request.name(), request.slug());
        var folder = folderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Folder not found"));
        return new MediaDtos.FolderResponse(folder.id(), folder.name(), folder.slug(), folder.parentFolderId(), folder.createdAt());
    }

    @Transactional
    public void deleteFolder(UUID id) {
        folderRepository.findById(id).orElseThrow(() -> new NotFoundException("Folder not found"));
        if (folderRepository.hasChildren(id)) {
            throw new IllegalArgumentException("Cannot delete folder with subfolders");
        }
        folderRepository.delete(id);
    }

    // --- Temp upload ---

    public MediaDtos.TempUploadResponse uploadTemp(InputStream data, String filename, String contentType, long size) {
        var ext = getExtension(filename);
        var tempKey = "temp/" + UUID.randomUUID() + ext;
        storageService.upload(tempKey, data, size, contentType);
        var previewUrl = storageService.generatePresignedUrl(tempKey, URL_TTL);
        return new MediaDtos.TempUploadResponse(tempKey, previewUrl);
    }

    // --- Create from temp ---

    @Transactional
    public MediaDtos.MediaItemResponse createFromTemp(MediaDtos.CreateMediaItemRequest request) {
        var ext = getExtension(request.tempKey());
        var itemId = UUID.randomUUID();
        var storageKey = "media/" + itemId + ext;

        // Copy from temp to permanent location
        storageService.copy(request.tempKey(), storageKey);
        storageService.delete(request.tempKey());

        // Detect filename from temp key
        var originalFilename = request.tempKey().substring(request.tempKey().lastIndexOf('/') + 1);

        // Create DB record
        var id = itemRepository.create(
            request.folderId(), originalFilename, storageKey,
            detectMimeType(ext), 0, null, null, request.altText()
        );

        return getById(id);
    }

    // --- CRUD ---

    public MediaDtos.MediaItemListResponse getItems(UUID folderId, String type, String search, int page, int limit) {
        var mimePrefix = type != null ? type + "/" : null;
        int offset = Math.max(0, (page - 1) * limit);
        var items = itemRepository.findAll(folderId, mimePrefix, search, offset, limit);
        long totalItems = itemRepository.count(folderId, mimePrefix, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = items.stream().map(this::toResponse).toList();
        return new MediaDtos.MediaItemListResponse(responses, page, limit, totalItems, totalPages);
    }

    public MediaDtos.MediaItemResponse getById(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return toResponse(item);
    }

    public String getUrl(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        return storageService.generatePresignedUrl(item.storageKey(), URL_TTL);
    }

    @Transactional
    public MediaDtos.MediaItemResponse updateItem(UUID id, MediaDtos.UpdateMediaItemRequest request) {
        itemRepository.findById(id).orElseThrow(() -> new NotFoundException("Media item not found"));
        itemRepository.update(id, request.altText(), request.folderId());
        return getById(id);
    }

    @Transactional
    public void deleteItem(UUID id) {
        var item = itemRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Media item not found"));
        storageService.delete(item.storageKey());
        itemRepository.delete(id);
    }

    // --- Helpers ---

    private MediaDtos.MediaItemResponse toResponse(MediaItemRepository.MediaItemRow row) {
        var url = storageService.generatePresignedUrl(row.storageKey(), URL_TTL);
        return new MediaDtos.MediaItemResponse(
            row.id(), row.originalFilename(), url, row.mimeType(),
            row.fileSizeBytes(), row.width(), row.height(), row.altText(),
            row.folderId(), row.createdAt()
        );
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private String detectMimeType(String ext) {
        return switch (ext.toLowerCase()) {
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".svg" -> "image/svg+xml";
            case ".pdf" -> "application/pdf";
            default -> "application/octet-stream";
        };
    }
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/shared/storage/
git add apps/backend/src/main/java/cz/samofujera/media/
git add apps/backend/src/main/java/cz/samofujera/catalog/internal/R2StorageService.java
git commit -m "feat(backend): add media service with shared storage and temp upload flow"
```

---

## Task 4: Media Module Backend — Admin Controller

**Files:**
- Create: `apps/backend/src/main/java/cz/samofujera/media/MediaAdminController.java`

**Step 1: Write the controller**

```java
package cz.samofujera.media;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/media")
public class MediaAdminController {

    private final MediaService mediaService;

    MediaAdminController(MediaService mediaService) {
        this.mediaService = mediaService;
    }

    // --- Folders ---

    @GetMapping("/folders")
    public ResponseEntity<ApiResponse<List<MediaDtos.FolderResponse>>> getFolders() {
        return ResponseEntity.ok(ApiResponse.ok(mediaService.getFolders()));
    }

    @PostMapping("/folders")
    public ResponseEntity<ApiResponse<MediaDtos.FolderResponse>> createFolder(
            @Valid @RequestBody MediaDtos.CreateFolderRequest request) {
        var folder = mediaService.createFolder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(folder));
    }

    @PutMapping("/folders/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.FolderResponse>> renameFolder(
            @PathVariable UUID id, @Valid @RequestBody MediaDtos.RenameFolderRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(mediaService.renameFolder(id, request)));
    }

    @DeleteMapping("/folders/{id}")
    public ResponseEntity<Void> deleteFolder(@PathVariable UUID id) {
        mediaService.deleteFolder(id);
        return ResponseEntity.noContent().build();
    }

    // --- Media Items ---

    @GetMapping
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemListResponse>> getItems(
            @RequestParam(required = false) UUID folderId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "24") int limit) {
        return ResponseEntity.ok(ApiResponse.ok(mediaService.getItems(folderId, type, search, page, limit)));
    }

    @PostMapping(value = "/upload-temp", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<MediaDtos.TempUploadResponse>> uploadTemp(
            @RequestParam("file") MultipartFile file) throws IOException {
        var response = mediaService.uploadTemp(
            file.getInputStream(), file.getOriginalFilename(),
            file.getContentType(), file.getSize()
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> createItem(
            @Valid @RequestBody MediaDtos.CreateMediaItemRequest request) {
        var item = mediaService.createFromTemp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(item));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> getItem(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(mediaService.getById(id)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<MediaDtos.MediaItemResponse>> updateItem(
            @PathVariable UUID id, @Valid @RequestBody MediaDtos.UpdateMediaItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(mediaService.updateItem(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID id) {
        mediaService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 2: Update SecurityConfig to allow `/api/admin/media/**`**

Check `SecurityConfig.java` — the existing pattern likely already covers `/api/admin/**` with ADMIN role requirement. Verify this during implementation; if not, add the media paths.

**Step 3: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/media/MediaAdminController.java
git commit -m "feat(backend): add media admin rest controller"
```

---

## Task 5: Category Backend Changes — Reorder Endpoint + Image Media ID

**Files:**
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/internal/CategoryRepository.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogDtos.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogService.java`
- Modify: `apps/backend/src/main/java/cz/samofujera/catalog/CatalogAdminController.java`

**Step 1: Update CategoryRepository**

Add methods:
- `updateSortOrders(List<UUID> orderedIds)` — batch update sort_order based on position
- Change `create`/`update` to use `imageMediaId` (UUID) instead of `imageUrl` (String)
- Add `findNextSortOrder()` for auto-assigning sort order on create

```java
// In CategoryRepository — update CategoryRow
public record CategoryRow(
    UUID id, String name, String slug, String description,
    UUID imageMediaId, String metaTitle, String metaDescription,
    int sortOrder, OffsetDateTime createdAt, OffsetDateTime updatedAt
) {}

// Update create() signature
public UUID create(String name, String slug, String description, UUID imageMediaId,
                   String metaTitle, String metaDescription, int sortOrder) {
    return dsl.insertInto(PRODUCT_CATEGORIES)
        .set(PRODUCT_CATEGORIES.NAME, name)
        .set(PRODUCT_CATEGORIES.SLUG, slug)
        .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
        .set(PRODUCT_CATEGORIES.IMAGE_MEDIA_ID, imageMediaId)
        .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
        .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
        .set(PRODUCT_CATEGORIES.SORT_ORDER, sortOrder)
        .returning(PRODUCT_CATEGORIES.ID)
        .fetchOne()
        .getId();
}

// Update update() signature
public void update(UUID id, String name, String slug, String description, UUID imageMediaId,
                   String metaTitle, String metaDescription) {
    dsl.update(PRODUCT_CATEGORIES)
        .set(PRODUCT_CATEGORIES.NAME, name)
        .set(PRODUCT_CATEGORIES.SLUG, slug)
        .set(PRODUCT_CATEGORIES.DESCRIPTION, description)
        .set(PRODUCT_CATEGORIES.IMAGE_MEDIA_ID, imageMediaId)
        .set(PRODUCT_CATEGORIES.META_TITLE, metaTitle)
        .set(PRODUCT_CATEGORIES.META_DESCRIPTION, metaDescription)
        .set(PRODUCT_CATEGORIES.UPDATED_AT, OffsetDateTime.now())
        .where(PRODUCT_CATEGORIES.ID.eq(id))
        .execute();
}

// Add reorder method
public void updateSortOrders(List<UUID> orderedIds) {
    for (int i = 0; i < orderedIds.size(); i++) {
        dsl.update(PRODUCT_CATEGORIES)
            .set(PRODUCT_CATEGORIES.SORT_ORDER, i)
            .where(PRODUCT_CATEGORIES.ID.eq(orderedIds.get(i)))
            .execute();
    }
}

// Add next sort order
public int findNextSortOrder() {
    var max = dsl.select(org.jooq.impl.DSL.max(PRODUCT_CATEGORIES.SORT_ORDER))
        .from(PRODUCT_CATEGORIES)
        .fetchOne(0, Integer.class);
    return (max != null ? max : -1) + 1;
}
```

**Step 2: Update CatalogDtos**

```java
// Update CreateCategoryRequest — replace imageUrl with imageMediaId, remove sortOrder
public record CreateCategoryRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 255) String slug,
    String description, UUID imageMediaId,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription
) {}

// Same for UpdateCategoryRequest
public record UpdateCategoryRequest(
    @NotBlank @Size(max = 255) String name,
    @NotBlank @Size(max = 255) String slug,
    String description, UUID imageMediaId,
    @Size(max = 255) String metaTitle,
    @Size(max = 500) String metaDescription
) {}

// Update CategoryResponse — replace imageUrl with imageUrl resolved from media
public record CategoryResponse(
    UUID id, String name, String slug, String description,
    UUID imageMediaId, String imageUrl,
    String metaTitle, String metaDescription, int sortOrder
) {}

// Add reorder request
public record ReorderCategoriesRequest(
    @NotNull List<UUID> categoryIds
) {}
```

**Step 3: Update CatalogService**

- `createCategory` — auto-assign sortOrder via `findNextSortOrder()`, use `imageMediaId`
- `updateCategory` — use `imageMediaId`, don't update sortOrder (managed by reorder)
- `toCategoryResponse` — resolve `imageUrl` from media service if `imageMediaId` is set
- Add `reorderCategories(List<UUID> ids)` method

The tricky part: CatalogService needs to resolve image URLs from the media module. Since this is cross-module, use `MediaService.getUrl(UUID id)`.

```java
// Add MediaService dependency to CatalogService constructor
private final MediaService mediaService;

// In toCategoryResponse:
private CatalogDtos.CategoryResponse toCategoryResponse(CategoryRepository.CategoryRow row) {
    String imageUrl = null;
    if (row.imageMediaId() != null) {
        try {
            imageUrl = mediaService.getUrl(row.imageMediaId());
        } catch (Exception ignored) {
            // media item may have been deleted
        }
    }
    return new CatalogDtos.CategoryResponse(
        row.id(), row.name(), row.slug(), row.description(),
        row.imageMediaId(), imageUrl,
        row.metaTitle(), row.metaDescription(), row.sortOrder()
    );
}

// Add reorder method
@Transactional
public void reorderCategories(List<UUID> categoryIds) {
    categoryRepository.updateSortOrders(categoryIds);
}
```

**Step 4: Update CatalogAdminController — add reorder endpoint**

```java
@PutMapping("/reorder")
public ResponseEntity<Void> reorderCategories(
        @Valid @RequestBody CatalogDtos.ReorderCategoriesRequest request) {
    catalogService.reorderCategories(request.categoryIds());
    return ResponseEntity.noContent().build();
}

// Also add GET endpoint for single category (needed for edit form)
@GetMapping("/{id}")
public ResponseEntity<ApiResponse<CatalogDtos.CategoryResponse>> getCategory(@PathVariable UUID id) {
    var categories = catalogService.getCategories();
    var category = categories.stream()
        .filter(c -> c.id().equals(id))
        .findFirst()
        .orElseThrow(() -> new cz.samofujera.shared.exception.NotFoundException("Category not found"));
    return ResponseEntity.ok(ApiResponse.ok(category));
}
```

**Step 5: Commit**

```bash
git add apps/backend/src/main/java/cz/samofujera/catalog/
git commit -m "feat(backend): add category reorder endpoint and image media id support"
```

---

## Task 6: Backend Integration Tests

**Files:**
- Create: `apps/backend/src/test/java/cz/samofujera/media/MediaIntegrationTest.java`
- Modify: `apps/backend/src/test/java/cz/samofujera/catalog/CatalogCategoryIntegrationTest.java`

**Step 1: Write media integration test**

Test the full flow: upload temp → create item → get item → delete item.
Test folder CRUD.
Test media items listing with pagination.

Follow existing test patterns from `CatalogCategoryIntegrationTest`:
- `@SpringBootTest`, `@AutoConfigureMockMvc`, `@Import(TestcontainersConfig.class)`
- `@MockitoBean` for `StorageService` (avoid actual R2 calls in tests)
- Use `adminPrincipal()` helper

**Step 2: Update category tests**

- Update test payloads: replace `imageUrl` with `imageMediaId`
- Remove `sortOrder` from create/update payloads
- Add test for reorder endpoint
- Add test for GET single category

**Step 3: Run tests**

Run: `cd apps/backend && ./mvnw test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add apps/backend/src/test/
git commit -m "test(backend): add media integration tests and update category tests"
```

---

## Task 7: Frontend — API Client Types + Methods for Media

**Files:**
- Modify: `packages/api-client/src/types.ts`
- Create: `packages/api-client/src/media.ts`
- Modify: `packages/api-client/src/admin.ts`
- Modify: `packages/api-client/src/index.ts`

**Step 1: Add media types to `types.ts`**

```typescript
// Media Library types
export interface MediaFolderResponse {
  id: string;
  name: string;
  slug: string;
  parentFolderId: string | null;
  createdAt: string;
}

export interface MediaItemResponse {
  id: string;
  originalFilename: string;
  url: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  folderId: string | null;
  createdAt: string;
}

export interface MediaItemListResponse {
  items: MediaItemResponse[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface TempUploadResponse {
  tempKey: string;
  previewUrl: string;
}

export interface CreateMediaFolderRequest {
  name: string;
  slug: string;
  parentFolderId?: string;
}

export interface RenameMediaFolderRequest {
  name: string;
  slug: string;
}

export interface CreateMediaItemRequest {
  tempKey: string;
  folderId?: string;
  altText?: string;
}

export interface UpdateMediaItemRequest {
  altText?: string;
  folderId?: string;
}
```

**Step 2: Update CategoryResponse and requests in `types.ts`**

```typescript
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageMediaId: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageMediaId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export type UpdateCategoryRequest = CreateCategoryRequest;
```

**Step 3: Create `media.ts` API client**

```typescript
import { apiFetch } from "./client";
import type {
  ApiResponse,
  MediaFolderResponse,
  MediaItemResponse,
  MediaItemListResponse,
  TempUploadResponse,
  CreateMediaFolderRequest,
  RenameMediaFolderRequest,
  CreateMediaItemRequest,
  UpdateMediaItemRequest,
} from "./types";

export const mediaApi = {
  // Folders
  getFolders: () =>
    apiFetch<ApiResponse<MediaFolderResponse[]>>("/api/admin/media/folders"),

  createFolder: (data: CreateMediaFolderRequest) =>
    apiFetch<ApiResponse<MediaFolderResponse>>("/api/admin/media/folders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  renameFolder: (id: string, data: RenameMediaFolderRequest) =>
    apiFetch<ApiResponse<MediaFolderResponse>>(`/api/admin/media/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteFolder: (id: string) =>
    apiFetch<void>(`/api/admin/media/folders/${id}`, { method: "DELETE" }),

  // Items
  getItems: (params?: {
    folderId?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.folderId) searchParams.set("folderId", params.folderId);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return apiFetch<ApiResponse<MediaItemListResponse>>(
      `/api/admin/media${qs ? `?${qs}` : ""}`,
    );
  },

  getItem: (id: string) =>
    apiFetch<ApiResponse<MediaItemResponse>>(`/api/admin/media/${id}`),

  uploadTemp: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiResponse<TempUploadResponse>>(
      "/api/admin/media/upload-temp",
      { method: "POST", body: formData },
    );
  },

  createItem: (data: CreateMediaItemRequest) =>
    apiFetch<ApiResponse<MediaItemResponse>>("/api/admin/media", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateItem: (id: string, data: UpdateMediaItemRequest) =>
    apiFetch<ApiResponse<MediaItemResponse>>(`/api/admin/media/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteItem: (id: string) =>
    apiFetch<void>(`/api/admin/media/${id}`, { method: "DELETE" }),
};
```

**Step 4: Update `admin.ts` — add reorder + getCategory**

```typescript
// Add to adminApi object:

getCategory: (id: string) =>
  apiFetch<ApiResponse<CategoryResponse>>(`/api/admin/categories/${id}`),

reorderCategories: (categoryIds: string[]) =>
  apiFetch<void>("/api/admin/categories/reorder", {
    method: "PUT",
    body: JSON.stringify({ categoryIds }),
  }),
```

**Step 5: Export from `index.ts`**

```typescript
export { mediaApi } from "./media";
```

**Step 6: Commit**

```bash
git add packages/api-client/
git commit -m "feat(api-client): add media library api and update category types"
```

---

## Task 8: Frontend — Install dnd-kit Dependencies

**Step 1: Install packages**

Run: `cd apps/web && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "deps(web): add dnd-kit packages for drag-and-drop"
```

---

## Task 9: Frontend — MediaPicker Dialog Component

**Files:**
- Create: `apps/web/src/components/admin/media/MediaGrid.tsx`
- Create: `apps/web/src/components/admin/media/FolderTree.tsx`
- Create: `apps/web/src/components/admin/media/MediaPicker.tsx`

**Step 1: Write MediaGrid (shared between standalone page and picker)**

A grid of media thumbnails with selection support. Shows filename, dimensions.
Accepts `onSelect` callback and `selected` state.

**Step 2: Write FolderTree (sidebar folder tree)**

Renders folder hierarchy. Highlights selected folder. Supports create/rename/delete in standalone mode, read-only in picker mode.

**Step 3: Write MediaPicker component**

```tsx
interface MediaPickerProps {
  value: string | null;        // current media item ID
  onChange: (id: string | null) => void;
  accept?: string;             // mime type filter, e.g. "image/*"
}
```

Shows: thumbnail preview if `value` is set + "Změnit" / "Odebrat" buttons.
Click "Vybrat obrázek" opens Dialog with FolderTree + MediaGrid.
Upload action: uploadTemp → createItem → select.

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/media/
git commit -m "feat(admin): add media picker dialog component"
```

---

## Task 10: Frontend — Media Library Standalone Page

**Files:**
- Create: `apps/web/src/components/admin/routes/media.tsx`
- Modify: `apps/web/src/components/admin/router.tsx` — add media route
- Modify: `apps/web/src/components/admin/AdminLayout.tsx` — add nav item

**Step 1: Write media page**

Full page with:
- Left sidebar: `FolderTree` with create/rename/delete
- Main area: `MediaGrid` with upload, bulk delete
- Click item opens detail panel (alt text edit, move to folder, delete)
- Filter by type dropdown, search input
- Pagination

**Step 2: Add route to router**

```typescript
import { MediaPage } from "./routes/media";

const mediaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/media",
  component: MediaPage,
});

// Add to routeTree
const routeTree = rootRoute.addChildren([
  dashboardRoute, usersRoute, productsRoute, productNewRoute, productEditRoute,
  categoriesRoute, // will be updated in task 12
  ordersRoute, orderDetailRoute,
  mediaRoute,
]);
```

**Step 3: Add to admin nav**

```typescript
// In AdminLayout.tsx navItems:
{ label: "Media", to: "/media" as const },
```

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/routes/media.tsx
git add apps/web/src/components/admin/router.tsx
git add apps/web/src/components/admin/AdminLayout.tsx
git commit -m "feat(admin): add media library standalone page"
```

---

## Task 11: Frontend — Category List with Drag Reorder

**Files:**
- Create: `apps/web/src/components/admin/routes/category-list.tsx`

**Step 1: Write the sortable category list**

Uses `@dnd-kit/core` and `@dnd-kit/sortable`:

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

Table columns: Grip handle | Image thumbnail | Name | Slug | Actions (Edit link, Delete button).

On drag end:
1. Reorder local array
2. Call `adminApi.reorderCategories(newOrder.map(c => c.id))`
3. Invalidate categories query on success

"Nová kategorie" button links to `/produkty/kategorie/nova`.

Delete with `window.confirm()`.

**Step 2: Commit**

```bash
git add apps/web/src/components/admin/routes/category-list.tsx
git commit -m "feat(admin): add category list with drag-to-reorder"
```

---

## Task 12: Frontend — Category Create/Edit Forms

**Files:**
- Create: `apps/web/src/components/admin/routes/category-new.tsx`
- Create: `apps/web/src/components/admin/routes/category-edit.tsx`

**Step 1: Write category create form**

Full-page form at `/produkty/kategorie/nova`:
- Name (required)
- Slug (auto-generated from name, manual override)
- Description (textarea)
- Image (MediaPicker component)
- SEO: Meta title, Meta description
- Save button → `adminApi.createCategory()` → navigate to list

**Step 2: Write category edit form**

Full-page form at `/produkty/kategorie/$categoryId`:
- Same fields as create
- Load existing data with `adminApi.getCategory(id)`
- Save button → `adminApi.updateCategory(id)` → navigate to list

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/routes/category-new.tsx
git add apps/web/src/components/admin/routes/category-edit.tsx
git commit -m "feat(admin): add category create and edit full-page forms"
```

---

## Task 13: Frontend — Router + Navigation Update

**Files:**
- Modify: `apps/web/src/components/admin/router.tsx`
- Modify: `apps/web/src/components/admin/AdminLayout.tsx`
- Delete: `apps/web/src/components/admin/routes/categories.tsx` (old dialog-based page)

**Step 1: Update router**

Replace old `categoriesRoute` with new routes:

```typescript
import { CategoryListPage } from "./routes/category-list";
import { CategoryNewPage } from "./routes/category-new";
import { CategoryEditPage } from "./routes/category-edit";

const categoryListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie",
  component: CategoryListPage,
});

const categoryNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie/nova",
  component: CategoryNewPage,
});

const categoryEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/produkty/kategorie/$categoryId",
  component: CategoryEditPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute, usersRoute,
  productsRoute, productNewRoute, productEditRoute,
  categoryListRoute, categoryNewRoute, categoryEditRoute,
  ordersRoute, orderDetailRoute,
  mediaRoute,
]);
```

Remove old `categoriesRoute` and `CategoriesPage` import.

**Step 2: Update admin nav**

```typescript
const navItems = [
  { label: "Dashboard", to: "/" as const },
  { label: "Users", to: "/users" as const },
  { label: "Produkty", to: "/produkty" as const },
  { label: "Kategorie", to: "/produkty/kategorie" as const },
  { label: "Media", to: "/media" as const },
  { label: "Objednávky", to: "/objednavky" as const },
] as const;
```

**Step 3: Delete old categories.tsx**

Remove `apps/web/src/components/admin/routes/categories.tsx`.

**Step 4: Commit**

```bash
git add apps/web/src/components/admin/router.tsx
git add apps/web/src/components/admin/AdminLayout.tsx
git rm apps/web/src/components/admin/routes/categories.tsx
git commit -m "feat(admin): wire up new category routes and media page in navigation"
```

---

## Task 14: Frontend Lint + Typecheck

**Step 1: Run lint and typecheck**

Run: `pnpm turbo lint` and `pnpm turbo typecheck`

Fix any errors.

**Step 2: Commit fixes if any**

```bash
git add -A
git commit -m "fix(web): resolve lint and typecheck errors"
```

---

## Task 15: End-to-End Verification

**Step 1: Start backend**

Run: `cd apps/backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev`

Verify: Migration V18 runs successfully. No startup errors.

**Step 2: Start frontend**

Run: `cd apps/web && pnpm dev`

**Step 3: Manual verification**

1. Navigate to `/admin/media` — media library page loads
2. Create a folder, upload an image to it
3. Navigate to `/admin/produkty/kategorie` — category list loads
4. Create a new category at `/admin/produkty/kategorie/nova` with image via MediaPicker
5. Drag categories to reorder
6. Edit a category
7. Delete a category

**Step 4: Run backend tests**

Run: `cd apps/backend && ./mvnw test`
Expected: All tests green.
