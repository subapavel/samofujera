package cz.samofujera.page;

import cz.samofujera.media.MediaService;
import cz.samofujera.page.internal.PageRepository;
import cz.samofujera.shared.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class PageService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final PageRepository pageRepository;
    private final MediaService mediaService;

    PageService(PageRepository pageRepository, MediaService mediaService) {
        this.pageRepository = pageRepository;
        this.mediaService = mediaService;
    }

    public PageDtos.PageListResponse getPages(String status, String type, String search, int page, int limit) {
        var items = pageRepository.findAll(status, type, search, page, limit);
        int total = pageRepository.count(status, type, search);
        var responses = items.stream().map(this::toPageResponse).toList();
        return new PageDtos.PageListResponse(responses, page, limit, total, (int) Math.ceil((double) total / limit));
    }

    public PageDtos.PageDetailResponse getPageById(UUID id) {
        var row = pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        return toDetailResponse(row);
    }

    public PageDtos.PublicPageResponse getPublishedPageBySlug(String slug) {
        var row = pageRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        if (!"PUBLISHED".equals(row.status())) {
            throw new NotFoundException("Page not found");
        }
        return new PageDtos.PublicPageResponse(
            row.slug(), row.title(), rawContent(row.content()),
            row.metaTitle(), row.metaDescription(),
            row.metaKeywords(), row.ogTitle(), row.ogDescription(),
            resolveOgImageUrl(row.ogImageId()), row.noindex(), row.nofollow()
        );
    }

    public PageDtos.PublicPageResponse getPageBySlug(String slug) {
        var row = pageRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        return new PageDtos.PublicPageResponse(
            row.slug(), row.title(), rawContent(row.content()),
            row.metaTitle(), row.metaDescription(),
            row.metaKeywords(), row.ogTitle(), row.ogDescription(),
            resolveOgImageUrl(row.ogImageId()), row.noindex(), row.nofollow()
        );
    }

    @Transactional
    public PageDtos.PageDetailResponse createPage(PageDtos.CreatePageRequest request, UUID createdBy) {
        var pageType = request.pageType() != null ? request.pageType() : "CUSTOM";
        var id = pageRepository.create(
            request.slug(), request.title(), pageType,
            JSONB.valueOf("{}"), null, null, null, createdBy
        );
        return getPageById(id);
    }

    @Transactional
    public PageDtos.PageDetailResponse updatePage(UUID id, PageDtos.UpdatePageRequest request) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        var contentJsonb = request.content() != null
            ? JSONB.valueOf(toJsonString(request.content()))
            : JSONB.valueOf("{}");
        pageRepository.update(id, request.slug(), request.title(), contentJsonb,
            request.metaTitle(), request.metaDescription(), request.ogImageId(),
            request.showInNav(), request.metaKeywords(), request.ogTitle(),
            request.ogDescription(), request.noindex(), request.nofollow());
        return getPageById(id);
    }

    @Transactional
    public void publishPage(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateStatus(id, "PUBLISHED");
        pageRepository.clearScheduledPublishAt(id);
    }

    @Transactional
    public void unpublishPage(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateStatus(id, "DRAFT");
    }

    @Transactional
    public void deletePage(UUID id) {
        var page = pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        if ("SYSTEM".equals(page.pageType())) {
            throw new IllegalArgumentException("System pages cannot be deleted");
        }
        pageRepository.delete(id);
    }

    @Transactional
    public void schedulePublish(UUID id, Instant scheduledAt) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateScheduledPublishAt(id, scheduledAt.atOffset(ZoneOffset.UTC));
    }

    @Transactional
    public void cancelScheduledPublish(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.clearScheduledPublishAt(id);
    }

    @Transactional
    public void publishDuePages() {
        var duePages = pageRepository.findDueForPublish(OffsetDateTime.now());
        for (var page : duePages) {
            pageRepository.updateStatus(page.id(), "PUBLISHED");
            pageRepository.clearScheduledPublishAt(page.id());
        }
    }

    private PageDtos.PageResponse toPageResponse(PageRepository.PageListRow row) {
        return new PageDtos.PageResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            null, null, null, row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt(),
            row.scheduledPublishAt()
        );
    }

    private PageDtos.PageDetailResponse toDetailResponse(PageRepository.PageRow row) {
        return new PageDtos.PageDetailResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            rawContent(row.content()), row.metaTitle(), row.metaDescription(),
            row.ogImageId(), row.metaKeywords(), row.ogTitle(), row.ogDescription(),
            row.noindex(), row.nofollow(),
            row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt(),
            row.scheduledPublishAt()
        );
    }

    private String resolveOgImageUrl(UUID ogImageId) {
        if (ogImageId == null) return null;
        try {
            var item = mediaService.getById(ogImageId);
            return item.originalUrl();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Returns the raw JSON string from JSONB — used with @JsonRawValue in DTOs
     * so it's embedded directly in the response without double-encoding.
     */
    private String rawContent(JSONB jsonb) {
        if (jsonb == null || jsonb.data() == null) return null;
        return jsonb.data();
    }

    private String toJsonString(Object content) {
        try {
            return JSON.writeValueAsString(content);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid content JSON");
        }
    }
}
