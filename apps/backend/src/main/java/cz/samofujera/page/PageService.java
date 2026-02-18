package cz.samofujera.page;

import cz.samofujera.page.internal.PageRepository;
import cz.samofujera.shared.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PageService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final PageRepository pageRepository;

    PageService(PageRepository pageRepository) {
        this.pageRepository = pageRepository;
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
            row.slug(), row.title(), parseContent(row.content()),
            row.metaTitle(), row.metaDescription()
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
            request.metaTitle(), request.metaDescription(), request.ogImageId());
        return getPageById(id);
    }

    @Transactional
    public void publishPage(UUID id) {
        pageRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Page not found"));
        pageRepository.updateStatus(id, "PUBLISHED");
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

    private PageDtos.PageResponse toPageResponse(PageRepository.PageListRow row) {
        return new PageDtos.PageResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            null, null, null, row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt()
        );
    }

    private PageDtos.PageDetailResponse toDetailResponse(PageRepository.PageRow row) {
        return new PageDtos.PageDetailResponse(
            row.id(), row.slug(), row.title(), row.status(), row.pageType(),
            parseContent(row.content()), row.metaTitle(), row.metaDescription(),
            row.ogImageId(), row.sortOrder(), row.showInNav(),
            row.createdAt(), row.updatedAt(), row.publishedAt()
        );
    }

    private Object parseContent(JSONB jsonb) {
        if (jsonb == null || jsonb.data() == null) return null;
        try {
            return JSON.readTree(jsonb.data());
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private String toJsonString(Object content) {
        try {
            return JSON.writeValueAsString(content);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid content JSON");
        }
    }
}
