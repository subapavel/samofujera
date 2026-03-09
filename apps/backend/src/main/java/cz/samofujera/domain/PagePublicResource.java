package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.PageEntity;
import cz.samofujera.domain.entity.PageRevisionEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

@Path("/api/pages")
@ApplicationScoped
@PermitAll
@Produces(MediaType.APPLICATION_JSON)
public class PagePublicResource {

    @GET
    @Path("/{slug}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PublicPageResponse>>> getPageBySlug(
            @PathParam("slug") String slug,
            @QueryParam("preview") @DefaultValue("false") boolean preview) {

        return PageEntity.findBySlug(slug)
                .onItem().ifNotNull().transformToUni(page -> {
                    // If not published and not preview mode, return 404
                    if (!"PUBLISHED".equals(page.status) && !preview) {
                        return Uni.createFrom().item(
                                RestResponse.<AuthDtos.ApiResponse<PageDtos.PublicPageResponse>>status(
                                        RestResponse.Status.NOT_FOUND));
                    }

                    // Use published revision content if available, else page content
                    if (page.publishedRevisionId != null && !preview) {
                        return PageRevisionEntity.<PageRevisionEntity>findById(page.publishedRevisionId)
                                .map(revision -> {
                                    String content = revision != null ? revision.content : page.content;
                                    return RestResponse.ok(AuthDtos.ApiResponse.ok(
                                            toPublicResponse(page, content)));
                                });
                    }

                    return Uni.createFrom().item(
                            RestResponse.ok(AuthDtos.ApiResponse.ok(
                                    toPublicResponse(page, page.content))));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @GET
    @Path("/product/{productSlug}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<PageDtos.PublicPageResponse>>> getPageByProduct(
            @PathParam("productSlug") String productSlug) {

        // Find page by joining to products table on slug
        // Since we don't have a products entity yet, query via native-like Panache query
        return PageEntity.find(
                        "pageType = 'PRODUCT' and productId in " +
                        "(select p.id from cz.samofujera.domain.entity.PageEntity p where 1=0)")
                .firstResult()
                // Fallback: find by slug pattern (product pages often use product slug)
                .onItem().ifNull().switchTo(() ->
                        PageEntity.find("pageType = 'PRODUCT' and slug = ?1", productSlug)
                                .firstResult())
                .onItem().ifNotNull().transform(entity -> {
                    PageEntity page = (PageEntity) entity;
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(
                            toPublicResponse(page, page.content)));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    private PageDtos.PublicPageResponse toPublicResponse(PageEntity page, String content) {
        return new PageDtos.PublicPageResponse(
                page.id, page.slug, page.title, content,
                page.metaTitle, page.metaDescription, page.metaKeywords,
                page.ogTitle, page.ogDescription,
                null, // ogImageUrl - would need image service to resolve
                page.noindex, page.nofollow);
    }
}
