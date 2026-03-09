package cz.samofujera.domain;

import io.smallrye.common.annotation.Blocking;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.nio.file.Files;

@Path("/api/files")
@ApplicationScoped
@PermitAll
@Blocking
public class FileServingResource {

    @Inject
    LocalStorageService storageService;

    @GET
    @Path("/{path:.+}")
    public Response serveFile(@PathParam("path") String path) throws IOException {
        java.nio.file.Path filePath = storageService.resolve(path);
        if (!Files.exists(filePath)) {
            return Response.status(404).build();
        }
        String mimeType = Files.probeContentType(filePath);
        if (mimeType == null) mimeType = "application/octet-stream";
        return Response.ok(filePath.toFile())
                .header("Content-Type", mimeType)
                .header("Cache-Control", "public, max-age=86400")
                .build();
    }
}
