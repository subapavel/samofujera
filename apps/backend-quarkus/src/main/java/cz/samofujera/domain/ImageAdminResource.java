package cz.samofujera.domain;

import cz.samofujera.auth.AuthDtos;
import cz.samofujera.domain.entity.ImageEntity;
import io.quarkus.hibernate.reactive.panache.PanacheQuery;
import io.quarkus.hibernate.reactive.panache.common.WithSession;
import io.quarkus.hibernate.reactive.panache.common.WithTransaction;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Parameters;
import io.smallrye.mutiny.Uni;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestResponse;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Path("/api/admin/images")
@ApplicationScoped
@RolesAllowed("ADMIN")
@Produces(MediaType.APPLICATION_JSON)
public class ImageAdminResource {

    @Inject
    LocalStorageService storageService;

    @GET
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ImageListResponse>>> getImages(
            @QueryParam("page") @DefaultValue("1") int page,
            @QueryParam("limit") @DefaultValue("20") int limit,
            @QueryParam("source") String source,
            @QueryParam("type") String mimeType,
            @QueryParam("search") String search) {

        List<String> conditions = new ArrayList<>();
        Parameters params = new Parameters();

        if (source != null && !source.isBlank()) {
            conditions.add("source = :source");
            params.and("source", source);
        }
        if (mimeType != null && !mimeType.isBlank()) {
            conditions.add("mimeType like :mimeType");
            params.and("mimeType", mimeType + "%");
        }
        if (search != null && !search.isBlank()) {
            conditions.add("(lower(originalFilename) like :search or lower(title) like :search or lower(altText) like :search)");
            params.and("search", "%" + search.toLowerCase() + "%");
        }

        String query = conditions.isEmpty() ? null : String.join(" and ", conditions);
        int pageIndex = Math.max(0, page - 1);

        PanacheQuery<ImageEntity> pq = query != null
                ? ImageEntity.find(query, params)
                : ImageEntity.findAll();

        return pq.page(Page.of(pageIndex, limit)).list()
                .chain(images -> pq.count().map(total -> {
                    int totalPages = (int) Math.ceil((double) total / limit);
                    List<CatalogDtos.ImageDetailResponse> items = images.stream()
                            .map(this::toImageDetailResponse)
                            .toList();
                    return RestResponse.ok(AuthDtos.ApiResponse.ok(
                            new CatalogDtos.ImageListResponse(items, page, limit, total, totalPages)));
                }));
    }

    @GET
    @Path("/{id}")
    @WithSession
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ImageDetailResponse>>> getImage(
            @PathParam("id") UUID id) {
        return ImageEntity.<ImageEntity>findById(id)
                .onItem().ifNotNull().transform(img -> RestResponse.ok(
                        AuthDtos.ApiResponse.ok(toImageDetailResponse(img))))
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @POST
    @Path("/upload")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ImageDetailResponse>>> uploadImage(
            @FormParam("file") FileUpload file,
            @FormParam("altText") String altText,
            @FormParam("title") String title,
            @QueryParam("public") @DefaultValue("false") boolean isPublic) {

        if (file == null) {
            return Uni.createFrom().item(
                    RestResponse.status(RestResponse.Status.BAD_REQUEST));
        }

        UUID imageId = UUID.randomUUID();
        String originalFilename = file.fileName();
        String mimeType = file.contentType();

        // File I/O is small and fast — acceptable on event loop for POC
        try {
            String storageKey = storageService.store(imageId, originalFilename,
                    Files.newInputStream(file.filePath()));
            long fileSize = Files.size(file.filePath());

            Integer width = null;
            Integer height = null;
            if (mimeType != null && mimeType.startsWith("image/")) {
                try {
                    BufferedImage bi = ImageIO.read(file.filePath().toFile());
                    if (bi != null) {
                        width = bi.getWidth();
                        height = bi.getHeight();
                    }
                } catch (Exception ignored) {}
            }

            var img = new ImageEntity();
            img.id = imageId;
            img.originalFilename = originalFilename;
            img.storageKey = storageKey;
            img.mimeType = mimeType;
            img.fileSizeBytes = fileSize;
            img.altText = altText;
            img.title = title;
            img.source = "UPLOAD";
            img.isPublic = isPublic;
            img.width = width;
            img.height = height;

            return img.<ImageEntity>persist()
                    .map(saved -> RestResponse.status(RestResponse.Status.CREATED,
                            AuthDtos.ApiResponse.ok(toImageDetailResponse(saved))));
        } catch (IOException e) {
            return Uni.createFrom().item(
                    RestResponse.status(RestResponse.Status.INTERNAL_SERVER_ERROR));
        }
    }

    @PATCH
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @WithTransaction
    public Uni<RestResponse<AuthDtos.ApiResponse<CatalogDtos.ImageDetailResponse>>> updateImage(
            @PathParam("id") UUID id,
            CatalogDtos.UpdateImageRequest request) {
        return ImageEntity.<ImageEntity>findById(id)
                .onItem().ifNotNull().transformToUni(img -> {
                    if (request.altText() != null) img.altText = request.altText();
                    if (request.title() != null) img.title = request.title();
                    return img.<ImageEntity>persist()
                            .map(saved -> RestResponse.ok(
                                    AuthDtos.ApiResponse.ok(toImageDetailResponse(saved))));
                })
                .onItem().ifNull().continueWith(
                        RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    @DELETE
    @Path("/{id}")
    @WithTransaction
    public Uni<RestResponse<Void>> deleteImage(@PathParam("id") UUID id) {
        return ImageEntity.deleteById(id)
                .map(deleted -> deleted
                        ? RestResponse.noContent()
                        : RestResponse.status(RestResponse.Status.NOT_FOUND));
    }

    private CatalogDtos.ImageDetailResponse toImageDetailResponse(ImageEntity img) {
        return new CatalogDtos.ImageDetailResponse(
                img.id,
                storageService.getUrl(img.storageKey),
                img.originalFilename,
                img.mimeType,
                img.fileSizeBytes != null ? img.fileSizeBytes : 0,
                img.width,
                img.height,
                img.title,
                img.altText,
                img.createdAt,
                List.of()  // usedIn — simplified for POC
        );
    }
}
