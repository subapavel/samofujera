package cz.samofujera.domain;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.PageEntity;
import cz.samofujera.domain.entity.PageRevisionEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/admin/pages")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class PageAdminResource {

    @Inject
    SecurityIdentity identity;

    @Inject
    ObjectMapper objectMapper;

    // ── List pages (paginated + filtered) ──────────────────────

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<StubDtos.PaginatedResponse<PageDtos.PageResponse>>>> listPages(
            @QueryParam("status") String status,
            @QueryParam("type") String type,
            @QueryParam("search") String search,
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit) {

        var conditions = new ArrayList<String>();
        var params = new HashMap<String, Object>();

        // Exclude PRODUCT type by default unless explicitly requested
        if (type != null && !type.isBlank()) {
            conditions.add("pageType = :pageType");
            params.put("pageType", type);
        } else {
            conditions.add("pageType != :excludeType");
            params.put("excludeType", "PRODUCT");
        }

        if (status != null && !status.isBlank()) {
            conditions.add("status = :status");
            params.put("status", status);
        }

        if (search != null && !search.isBlank()) {
            conditions.add("(lower(title) like :search or lower(slug) like :search)");
            params.put("search", "%" + search.toLowerCase() + "%");
        }

        String query = String.join(" and ", conditions);
        int pageIndex = Math.max(0, page - 1);

        // Sequential: count first, then list
        return PageEntity.count(query, params)
                .chain(totalItems -> PageEntity.find(query, Sort.by("updatedAt", Sort.Direction.Descending), params)
                        .page(Page.of(pageIndex, limit))
                        .<PageEntity>list()
                        .map(entities -> {
                            int totalPages = (int) Math.ceil((double) totalItems / limit);

                            List<PageDtos.PageResponse> items = entities.stream()
                                    .map(this::toPageResponse)
                                    .toList();

                            return RestResponse.ok(AuthDtos.ApiResponse.ok(
                                    new StubDtos.PaginatedResponse<>(items, page, limit, totalItems, totalPages)));
                        }));
    }

    // ── Get page detail ────────────────────────────────────────

    @GET
    @Path("/{id}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PageDetailResponse>>> getPage(
            @PathParam("id") UUID id) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transform(page ->
                        RestResponse.ok(AuthDtos.ApiResponse.ok(toPageDetailResponse(page))))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Get page by product ────────────────────────────────────

    @GET
    @Path("/by-product/{productId}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PageDetailResponse>>> getPageByProduct(
            @PathParam("productId") UUID productId) {

        return PageEntity.findByProductId(productId)
                .onItem().ifNotNull().transform(page ->
                        RestResponse.ok(AuthDtos.ApiResponse.ok(toPageDetailResponse(page))))
                .onItem().ifNull().continueWith(
                        RestResponse.ok(AuthDtos.ApiResponse.<PageDtos.PageDetailResponse>ok(null)));
    }

    // ── Create page ────────────────────────────────────────────

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PageDetailResponse>>> createPage(
            @Valid PageDtos.CreatePageRequest request) {

        Long userId = identity.getAttribute("user_id");

        var page = new PageEntity();
        page.slug = request.slug();
        page.title = request.title();
        page.status = "DRAFT";
        page.pageType = request.pageType() != null ? request.pageType() : "CUSTOM";
        page.productId = request.productId();
        page.createdBy = userId;
        page.createdAt = Instant.now();
        page.updatedAt = Instant.now();
        page.sortOrder = 0;
        page.showInNav = false;
        page.content = "{}";
        page.noindex = false;
        page.nofollow = false;

        return page.<PageEntity>persist()
                .map(saved -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(toPageDetailResponse(saved))));
    }

    // ── Update page ────────────────────────────────────────────

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PageDetailResponse>>> updatePage(
            @PathParam("id") UUID id,
            PageDtos.UpdatePageRequest request) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    if (request.slug() != null) page.slug = request.slug();
                    if (request.title() != null) page.title = request.title();
                    if (request.content() != null) {
                        page.content = serializeContent(request.content());
                    }
                    if (request.metaTitle() != null) page.metaTitle = request.metaTitle();
                    if (request.metaDescription() != null) page.metaDescription = request.metaDescription();
                    if (request.metaKeywords() != null) page.metaKeywords = request.metaKeywords();
                    if (request.ogTitle() != null) page.ogTitle = request.ogTitle();
                    if (request.ogDescription() != null) page.ogDescription = request.ogDescription();
                    if (request.ogImageId() != null) page.ogImageId = request.ogImageId();
                    if (request.showInNav() != null) page.showInNav = request.showInNav();
                    if (request.noindex() != null) page.noindex = request.noindex();
                    if (request.nofollow() != null) page.nofollow = request.nofollow();
                    page.updatedAt = Instant.now();

                    return page.<PageEntity>persist()
                            .map(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(toPageDetailResponse(saved))));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Publish page ───────────────────────────────────────────

    @PUT
    @Path("/{id}/publish")
    @WithTransaction
    public Uni<RestResponse<Void>> publishPage(@PathParam("id") UUID id) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    Long userId = identity.getAttribute("user_id");

                    return PageRevisionEntity.findMaxVersion(page.id)
                            .chain(maxVersion -> {
                                var revision = new PageRevisionEntity();
                                revision.pageId = page.id;
                                revision.version = maxVersion + 1;
                                revision.content = page.content;
                                revision.title = page.title;
                                revision.slug = page.slug;
                                revision.metaTitle = page.metaTitle;
                                revision.metaDescription = page.metaDescription;
                                revision.metaKeywords = page.metaKeywords;
                                revision.ogTitle = page.ogTitle;
                                revision.ogDescription = page.ogDescription;
                                revision.ogImageId = page.ogImageId;
                                revision.noindex = page.noindex;
                                revision.nofollow = page.nofollow;
                                revision.createdBy = userId;
                                revision.createdAt = Instant.now();

                                return revision.<PageRevisionEntity>persist();
                            })
                            .chain(savedRevision -> {
                                page.status = "PUBLISHED";
                                page.publishedAt = Instant.now();
                                page.publishedRevisionId = savedRevision.id;
                                page.scheduledPublishAt = null;
                                page.updatedAt = Instant.now();
                                return page.persist();
                            })
                            .map(v -> RestResponse.<Void>noContent());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Unpublish page ─────────────────────────────────────────

    @PUT
    @Path("/{id}/unpublish")
    @WithTransaction
    public Uni<RestResponse<Void>> unpublishPage(@PathParam("id") UUID id) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    page.status = "DRAFT";
                    page.updatedAt = Instant.now();
                    return page.persist()
                            .map(v -> RestResponse.<Void>noContent());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Schedule publish ───────────────────────────────────────

    @PUT
    @Path("/{id}/schedule")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<Void>> schedulePage(
            @PathParam("id") UUID id,
            @Valid PageDtos.SchedulePublishRequest request) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    page.scheduledPublishAt = request.scheduledPublishAt();
                    page.updatedAt = Instant.now();
                    return page.persist()
                            .map(v -> RestResponse.<Void>noContent());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Cancel scheduled publish ───────────────────────────────

    @PUT
    @Path("/{id}/schedule/cancel")
    @WithTransaction
    public Uni<RestResponse<Void>> cancelSchedule(@PathParam("id") UUID id) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    page.scheduledPublishAt = null;
                    page.updatedAt = Instant.now();
                    return page.persist()
                            .map(v -> RestResponse.<Void>noContent());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Delete page ────────────────────────────────────────────

    @DELETE
    @Path("/{id}")
    @WithTransaction
    public Uni<RestResponse<Void>> deletePage(@PathParam("id") UUID id) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page -> {
                    if ("SYSTEM".equals(page.pageType) || "PRODUCT".equals(page.pageType)) {
                        return Uni.createFrom().item(
                                RestResponse.<Void>status(RestResponse.Status.FORBIDDEN));
                    }
                    return page.delete()
                            .map(v -> RestResponse.<Void>noContent());
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── List revisions ─────────────────────────────────────────

    @GET
    @Path("/{id}/revisions")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<List<PageDtos.RevisionResponse>>>> getRevisions(
            @PathParam("id") UUID id) {

        return PageRevisionEntity.findByPageId(id)
                .map(revisions -> {
                    List<PageDtos.RevisionResponse> items = revisions.stream()
                            .map(r -> new PageDtos.RevisionResponse(
                                    r.id, r.version, r.title, r.slug, r.createdBy, r.createdAt))
                            .toList();
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(items));
                });
    }

    // ── Restore revision ───────────────────────────────────────

    @POST
    @Path("/{id}/revisions/{revisionId}/restore")
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PageDetailResponse>>> restoreRevision(
            @PathParam("id") UUID id,
            @PathParam("revisionId") UUID revisionId) {

        return PageEntity.<PageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(page ->
                        PageRevisionEntity.<PageRevisionEntity>findById(revisionId)
                                .onItem().ifNotNull().transformToUni(revision -> {
                                    page.content = revision.content;
                                    page.title = revision.title;
                                    page.slug = revision.slug;
                                    page.metaTitle = revision.metaTitle;
                                    page.metaDescription = revision.metaDescription;
                                    page.metaKeywords = revision.metaKeywords;
                                    page.ogTitle = revision.ogTitle;
                                    page.ogDescription = revision.ogDescription;
                                    page.ogImageId = revision.ogImageId;
                                    page.noindex = revision.noindex;
                                    page.nofollow = revision.nofollow;
                                    page.updatedAt = Instant.now();

                                    return page.<PageEntity>persist()
                                            .map(saved -> RestResponse.ok(
                                                    AuthDtos.ApiResponse.ok(toPageDetailResponse(saved))));
                                })
                                .onItem().ifNull().continueWith(
                                        RestResponse.status(RestResponse.Status.NOT_FOUND))
                )
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    // ── Helpers ────────────────────────────────────────────────

    private String serializeContent(Object content) {
        if (content == null) return null;
        if (content instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(content);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize content", e);
        }
    }

    private PageDtos.PageResponse toPageResponse(PageEntity page) {
        return new PageDtos.PageResponse(
                page.id, page.slug, page.title, page.status, page.pageType,
                page.metaTitle, page.metaDescription, page.ogImageId,
                page.sortOrder, page.showInNav,
                page.createdAt, page.updatedAt, page.publishedAt,
                page.scheduledPublishAt, page.productId);
    }

    private PageDtos.PageDetailResponse toPageDetailResponse(PageEntity page) {
        return new PageDtos.PageDetailResponse(
                page.id, page.slug, page.title, page.status, page.pageType,
                page.content,
                page.metaTitle, page.metaDescription, page.metaKeywords,
                page.ogTitle, page.ogDescription, page.ogImageId,
                page.noindex, page.nofollow,
                page.sortOrder, page.showInNav,
                page.createdAt, page.updatedAt, page.publishedAt,
                page.scheduledPublishAt, page.publishedRevisionId, page.productId);
    }
}
