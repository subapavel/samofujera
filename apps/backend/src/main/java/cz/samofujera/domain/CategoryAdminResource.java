package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.CategoryEntity;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.List;
import java.util.UUID;

@Path("/api/admin/categories")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class CategoryAdminResource {

    @GET
    @Path("/{id}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.CategoryResponse>>> getCategory(
            @PathParam("id") UUID id) {
        return CategoryEntity.<CategoryEntity>findById(id)
                .onItem().ifNotNull().transform(cat -> RestResponse.ok(
                        AuthDtos.ApiResponse.ok(toCategoryResponse(cat))))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.CategoryResponse>>> createCategory(
            CatalogDtos.CreateCategoryRequest request) {
        var cat = new CategoryEntity();
        cat.name = request.name();
        cat.slug = request.slug();
        cat.description = request.description();
        cat.sortOrder = request.sortOrder() != null ? request.sortOrder() : 0;
        return cat.<CategoryEntity>persist()
                .map(saved -> RestResponse.status(RestResponse.Status.CREATED,
                        AuthDtos.ApiResponse.ok(toCategoryResponse(saved))));
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.CategoryResponse>>> updateCategory(
            @PathParam("id") UUID id,
            CatalogDtos.UpdateCategoryRequest request) {
        return CategoryEntity.<CategoryEntity>findById(id)
                .onItem().ifNotNull().transformToUni(cat -> {
                    if (request.name() != null) cat.name = request.name();
                    if (request.slug() != null) cat.slug = request.slug();
                    if (request.description() != null) cat.description = request.description();
                    if (request.sortOrder() != null) cat.sortOrder = request.sortOrder();
                    return cat.<CategoryEntity>persist()
                            .map(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(toCategoryResponse(saved))));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @PUT
    @Path("/reorder")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<Void>> reorderCategories(CatalogDtos.ReorderCategoriesRequest request) {
        List<UUID> ids = request.categoryIds();
        Uni<Void> chain = Uni.createFrom().voidItem();
        for (int i = 0; i < ids.size(); i++) {
            final int order = i;
            final UUID catId = ids.get(i);
            chain = chain.chain(() -> CategoryEntity.<CategoryEntity>findById(catId)
                    .onItem().ifNotNull().transformToUni(cat -> {
                        cat.sortOrder = order;
                        return cat.persist().replaceWithVoid();
                    })
                    .onItem().ifNull().continueWith(() -> null));
        }
        return chain.map(v -> RestResponse.ok());
    }

    @DELETE
    @Path("/{id}")
    @WithTransaction
    public Uni<RestResponse<Void>> deleteCategory(@PathParam("id") UUID id) {
        return CategoryEntity.deleteById(id)
                .map(deleted -> deleted
                        ? RestResponse.noContent()
                        : RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    private static CatalogDtos.CategoryResponse toCategoryResponse(CategoryEntity cat) {
        return new CatalogDtos.CategoryResponse(
                cat.id, cat.name, cat.slug, cat.description,
                cat.sortOrder, cat.createdAt, cat.updatedAt);
    }
}
