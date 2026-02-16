package cz.samofujera.media.internal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class ImageVariantServiceTest {

    private ImageVariantService service;

    @BeforeEach
    void setUp() {
        service = new ImageVariantService();
    }

    @Test
    void shouldGenerateAllFourVariants() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");

        assertThat(variants).containsKeys("thumb", "medium", "large", "og");
        assertThat(variants).hasSize(4);
    }

    @Test
    void shouldGenerateThumbAt300x300() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");
        var thumb = variants.get("thumb");

        var thumbImage = ImageIO.read(new ByteArrayInputStream(thumb.data()));
        assertThat(thumbImage.getWidth()).isEqualTo(300);
        assertThat(thumbImage.getHeight()).isEqualTo(300);
        assertThat(thumb.width()).isEqualTo(300);
        assertThat(thumb.height()).isEqualTo(300);
    }

    @Test
    void shouldGenerateMediumAt600x600() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");
        var medium = variants.get("medium");

        var mediumImage = ImageIO.read(new ByteArrayInputStream(medium.data()));
        assertThat(mediumImage.getWidth()).isEqualTo(600);
        assertThat(mediumImage.getHeight()).isEqualTo(600);
        assertThat(medium.width()).isEqualTo(600);
        assertThat(medium.height()).isEqualTo(600);
    }

    @Test
    void shouldGenerateLargeAt1200x1200() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");
        var large = variants.get("large");

        var largeImage = ImageIO.read(new ByteArrayInputStream(large.data()));
        assertThat(largeImage.getWidth()).isEqualTo(1200);
        assertThat(largeImage.getHeight()).isEqualTo(1200);
        assertThat(large.width()).isEqualTo(1200);
        assertThat(large.height()).isEqualTo(1200);
    }

    @Test
    void shouldGenerateOgAt1200x630() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");
        var og = variants.get("og");

        var ogImage = ImageIO.read(new ByteArrayInputStream(og.data()));
        assertThat(ogImage.getWidth()).isEqualTo(1200);
        assertThat(ogImage.getHeight()).isEqualTo(630);
        assertThat(og.width()).isEqualTo(1200);
        assertThat(og.height()).isEqualTo(630);
    }

    @Test
    void shouldReturnWebpContentType() throws IOException {
        var imageData = createTestJpeg(2000, 1500);

        var variants = service.generateVariants(imageData, "image/jpeg");

        for (var entry : variants.entrySet()) {
            assertThat(entry.getValue().contentType())
                .as("Variant '%s' should have webp content type", entry.getKey())
                .isEqualTo("image/webp");
        }
    }

    @Test
    void shouldHandleSmallImageWithoutUpscaling() throws IOException {
        // 200x150 image is smaller than all targets
        var imageData = createTestJpeg(200, 150);

        var variants = service.generateVariants(imageData, "image/jpeg");

        assertThat(variants).hasSize(4);

        // For thumb (300x300 target, 1:1 ratio), small image should be cropped to aspect ratio
        var thumb = variants.get("thumb");
        var thumbImage = ImageIO.read(new ByteArrayInputStream(thumb.data()));
        // 1:1 ratio from 200x150 -> crop to 150x150 (height-limited)
        assertThat(thumbImage.getWidth()).isEqualTo(150);
        assertThat(thumbImage.getHeight()).isEqualTo(150);

        // For og (1200x630 target, ~1.905:1 ratio), from 200x150
        // srcRatio=1.333, targetRatio=1.905, srcRatio < targetRatio -> cropW=200, cropH=round(200/1.905)=105
        var og = variants.get("og");
        var ogImage = ImageIO.read(new ByteArrayInputStream(og.data()));
        assertThat(ogImage.getWidth()).isEqualTo(200);
        assertThat(ogImage.getHeight()).isEqualTo(105);

        // No variant should be larger than the original dimensions
        for (var entry : variants.entrySet()) {
            var img = ImageIO.read(new ByteArrayInputStream(entry.getValue().data()));
            assertThat(img.getWidth())
                .as("Variant '%s' width should not exceed original", entry.getKey())
                .isLessThanOrEqualTo(200);
            assertThat(img.getHeight())
                .as("Variant '%s' height should not exceed original", entry.getKey())
                .isLessThanOrEqualTo(150);
        }
    }

    @Test
    void shouldReturnEmptyMapForNonImageMimeType() throws IOException {
        var pdfData = "fake pdf content".getBytes();

        var variants = service.generateVariants(pdfData, "application/pdf");

        assertThat(variants).isEmpty();
    }

    @Test
    void shouldReturnEmptyMapForNullMimeType() throws IOException {
        var data = "some data".getBytes();

        var variants = service.generateVariants(data, null);

        assertThat(variants).isEmpty();
    }

    private byte[] createTestJpeg(int width, int height) throws IOException {
        var image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, width, height);
        g.setColor(Color.WHITE);
        g.fillRect(width / 4, height / 4, width / 2, height / 2);
        g.dispose();

        var baos = new ByteArrayOutputStream();
        ImageIO.write(image, "JPEG", baos);
        return baos.toByteArray();
    }
}
