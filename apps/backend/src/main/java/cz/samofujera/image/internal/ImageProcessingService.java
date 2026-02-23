package cz.samofujera.image.internal;

import net.coobird.thumbnailator.Thumbnails;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
class ImageProcessingService {

    private static final int MAX_DIMENSION = 2400;

    /**
     * Resize if longest side exceeds MAX_DIMENSION.
     * Preserves original format.
     * Returns null if no resize needed or not a raster image.
     */
    public byte[] optimizeIfNeeded(byte[] imageData, String mimeType) throws IOException {
        if (mimeType == null) return null;
        // Skip SVG and GIF
        if (mimeType.contains("svg") || mimeType.contains("gif")) return null;
        if (!mimeType.startsWith("image/")) return null;

        BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
        if (image == null) return null;

        int w = image.getWidth();
        int h = image.getHeight();
        int longest = Math.max(w, h);

        if (longest <= MAX_DIMENSION) return null;

        // Determine output format from MIME
        String format = mimeType.contains("png") ? "png" : "jpeg";

        var baos = new ByteArrayOutputStream();
        double scale = (double) MAX_DIMENSION / longest;
        Thumbnails.of(image)
            .scale(scale)
            .outputFormat(format)
            .outputQuality(0.9)
            .toOutputStream(baos);

        return baos.toByteArray();
    }
}
