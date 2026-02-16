package cz.samofujera.media.internal;

import net.coobird.thumbnailator.Thumbnails;
import net.coobird.thumbnailator.geometry.Positions;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class ImageVariantService {

    public record VariantResult(byte[] data, String contentType, int width, int height) {}

    private record VariantSpec(String name, int width, int height) {}

    private static final VariantSpec[] SPECS = {
        new VariantSpec("thumb", 300, 300),
        new VariantSpec("medium", 600, 600),
        new VariantSpec("large", 1200, 1200),
        new VariantSpec("og", 1200, 630),
    };

    public Map<String, VariantResult> generateVariants(byte[] originalData, String mimeType) throws IOException {
        if (mimeType == null || !mimeType.startsWith("image/")) {
            return Map.of();
        }

        var original = ImageIO.read(new ByteArrayInputStream(originalData));
        if (original == null) {
            return Map.of();
        }

        var results = new LinkedHashMap<String, VariantResult>();
        for (var spec : SPECS) {
            var variant = generateVariant(original, spec.width, spec.height);
            results.put(spec.name, variant);
        }
        return results;
    }

    private VariantResult generateVariant(BufferedImage original, int targetWidth, int targetHeight) throws IOException {
        int srcW = original.getWidth();
        int srcH = original.getHeight();

        if (srcW <= targetWidth && srcH <= targetHeight) {
            return generateSmallImageVariant(original, srcW, srcH, targetWidth, targetHeight);
        }

        return generateNormalVariant(original, targetWidth, targetHeight);
    }

    private VariantResult generateSmallImageVariant(BufferedImage original, int srcW, int srcH,
                                                     int targetWidth, int targetHeight) throws IOException {
        double targetRatio = (double) targetWidth / targetHeight;
        double srcRatio = (double) srcW / srcH;
        int cropW, cropH;
        if (srcRatio > targetRatio) {
            cropH = srcH;
            cropW = (int) Math.round(srcH * targetRatio);
        } else {
            cropW = srcW;
            cropH = (int) Math.round(srcW / targetRatio);
        }

        var baos = new ByteArrayOutputStream();
        Thumbnails.of(original)
            .sourceRegion(Positions.CENTER, cropW, cropH)
            .size(cropW, cropH)
            .outputFormat("webp")
            .toOutputStream(baos);

        var resultImage = ImageIO.read(new ByteArrayInputStream(baos.toByteArray()));
        return new VariantResult(baos.toByteArray(), "image/webp",
            resultImage != null ? resultImage.getWidth() : cropW,
            resultImage != null ? resultImage.getHeight() : cropH);
    }

    private VariantResult generateNormalVariant(BufferedImage original, int targetWidth, int targetHeight) throws IOException {
        var baos = new ByteArrayOutputStream();
        Thumbnails.of(original)
            .size(targetWidth, targetHeight)
            .crop(Positions.CENTER)
            .outputFormat("webp")
            .toOutputStream(baos);

        return new VariantResult(baos.toByteArray(), "image/webp", targetWidth, targetHeight);
    }
}
