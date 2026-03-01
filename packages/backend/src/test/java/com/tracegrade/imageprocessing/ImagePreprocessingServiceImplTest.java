package com.tracegrade.imageprocessing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class ImagePreprocessingServiceImplTest {

    private ImagePreprocessingServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ImagePreprocessingServiceImpl();
    }

    // -------------------------------------------------------------------------
    // PDF conversion (AC-002)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("PDF → PNG conversion")
    class PdfConversionTests {

        @Test
        @DisplayName("Single-page PDF produces one PNG with correct metadata")
        void singlePagePdfConverted() throws IOException {
            byte[] pdfBytes = createMinimalPdf(1);

            List<PreprocessedImage> result = service.preprocess("exam.pdf", pdfBytes, "application/pdf");

            assertThat(result).hasSize(1);
            PreprocessedImage page = result.get(0);
            assertThat(page.filename()).isEqualTo("exam_page1.png");
            assertThat(page.contentType()).isEqualTo("image/png");
            assertThat(page.format()).isEqualTo("png");
            assertThat(page.content()).isNotEmpty();

            // Verify the output bytes decode as a valid PNG
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(page.content()));
            assertThat(image).isNotNull();
        }

        @Test
        @DisplayName("Two-page PDF produces two PNG pages with sequential names")
        void twoPagePdfProducesTwoImages() throws IOException {
            byte[] pdfBytes = createMinimalPdf(2);

            List<PreprocessedImage> result = service.preprocess("report.pdf", pdfBytes, "application/pdf");

            assertThat(result).hasSize(2);
            assertThat(result.get(0).filename()).isEqualTo("report_page1.png");
            assertThat(result.get(1).filename()).isEqualTo("report_page2.png");
        }

        @Test
        @DisplayName("PreprocessingException thrown for corrupt PDF bytes")
        void corruptPdfThrowsException() {
            byte[] notPdf = "this is not a PDF".getBytes();

            assertThatThrownBy(() -> service.preprocess("bad.pdf", notPdf, "application/pdf"))
                    .isInstanceOf(PreprocessingException.class)
                    .satisfies(e -> assertThat(((PreprocessingException) e).getFormat()).isEqualTo("pdf"));
        }
    }

    // -------------------------------------------------------------------------
    // HEIC conversion (AC-001)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("HEIC → JPG conversion")
    class HeicConversionTests {

        @Test
        @DisplayName("PreprocessingException with actionable message when libheif is absent")
        void heicWithoutNativePluginThrowsException() {
            // Bytes with HEIC ftyp magic but not a real HEIC — ImageIO.read() returns null
            byte[] fakeHeic = createFakeHeicBytes();

            assertThatThrownBy(() -> service.preprocess("photo.heic", fakeHeic, "image/heic"))
                    .isInstanceOf(PreprocessingException.class)
                    .hasMessageContaining("HEIC")
                    .satisfies(e -> assertThat(((PreprocessingException) e).getFormat()).isEqualTo("heic"));
        }

        @Test
        @DisplayName("HEIF extension also routes to HEIC handler")
        void heifExtensionRoutedToHeicHandler() {
            byte[] fakeHeif = createFakeHeicBytes();

            assertThatThrownBy(() -> service.preprocess("photo.heif", fakeHeif, "image/heif"))
                    .isInstanceOf(PreprocessingException.class)
                    .satisfies(e -> assertThat(((PreprocessingException) e).getFormat()).isEqualTo("heic"));
        }
    }

    // -------------------------------------------------------------------------
    // Image enhancement (AC-003)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Raster image preprocessing (JPEG / PNG)")
    class RasterImageTests {

        @Test
        @DisplayName("JPEG is preprocessed and output is a valid JPEG")
        void jpegPreprocessedSuccessfully() throws IOException {
            byte[] jpegBytes = createMinimalJpeg(10, 10, Color.GRAY);

            List<PreprocessedImage> result = service.preprocess("exam.jpg", jpegBytes, "image/jpeg");

            assertThat(result).hasSize(1);
            PreprocessedImage img = result.get(0);
            assertThat(img.filename()).isEqualTo("exam.jpg");
            assertThat(img.contentType()).isEqualTo("image/jpeg");
            assertThat(img.format()).isEqualTo("jpg");

            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(img.content()));
            assertThat(decoded).isNotNull();
        }

        @Test
        @DisplayName("PNG is preprocessed and output is a valid PNG")
        void pngPreprocessedSuccessfully() throws IOException {
            byte[] pngBytes = createMinimalPng(8, 8, Color.BLUE);

            List<PreprocessedImage> result = service.preprocess("scan.png", pngBytes, "image/png");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).contentType()).isEqualTo("image/png");

            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result.get(0).content()));
            assertThat(decoded).isNotNull();
        }

        @Test
        @DisplayName("PreprocessingException thrown for unreadable raster image")
        void unreadableImageThrowsException() {
            byte[] garbage = new byte[]{0x00, 0x01, 0x02};

            assertThatThrownBy(() -> service.preprocess("bad.jpg", garbage, "image/jpeg"))
                    .isInstanceOf(PreprocessingException.class);
        }
    }

    // -------------------------------------------------------------------------
    // enhanceContrast unit tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("enhanceContrast")
    class EnhanceContrastTests {

        @Test
        @DisplayName("Returns non-null BufferedImage for TYPE_INT_RGB input")
        void enhancesRgbImage() {
            BufferedImage src = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
            BufferedImage result = service.enhanceContrast(src);
            assertThat(result).isNotNull();
            assertThat(result.getWidth()).isEqualTo(4);
            assertThat(result.getHeight()).isEqualTo(4);
        }

        @Test
        @DisplayName("Alpha-channel images are composited to RGB before enhancement")
        void enhancesArgbImage() {
            BufferedImage src = new BufferedImage(4, 4, BufferedImage.TYPE_INT_ARGB);
            BufferedImage result = service.enhanceContrast(src);
            assertThat(result).isNotNull();
        }
    }

    // -------------------------------------------------------------------------
    // rotateForOrientation unit tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("rotateForOrientation")
    class RotationTests {

        @Test
        @DisplayName("Orientation 1 (normal) returns same dimensions")
        void orientation1NoChange() {
            BufferedImage src = new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB);
            BufferedImage result = service.rotateForOrientation(src, 1);
            assertThat(result.getWidth()).isEqualTo(20);
            assertThat(result.getHeight()).isEqualTo(10);
        }

        @Test
        @DisplayName("Orientation 3 (180°) preserves dimensions")
        void orientation3Preserves() {
            BufferedImage src = new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB);
            BufferedImage result = service.rotateForOrientation(src, 3);
            assertThat(result.getWidth()).isEqualTo(20);
            assertThat(result.getHeight()).isEqualTo(10);
        }

        @Test
        @DisplayName("Orientation 6 (90° CW) swaps width and height")
        void orientation6SwapsDims() {
            BufferedImage src = new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB);
            BufferedImage result = service.rotateForOrientation(src, 6);
            assertThat(result.getWidth()).isEqualTo(10);
            assertThat(result.getHeight()).isEqualTo(20);
        }

        @Test
        @DisplayName("Orientation 8 (90° CCW) swaps width and height")
        void orientation8SwapsDims() {
            BufferedImage src = new BufferedImage(20, 10, BufferedImage.TYPE_INT_RGB);
            BufferedImage result = service.rotateForOrientation(src, 8);
            assertThat(result.getWidth()).isEqualTo(10);
            assertThat(result.getHeight()).isEqualTo(20);
        }
    }

    // -------------------------------------------------------------------------
    // Helper utilities
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("extractExtension")
    class ExtractExtensionTests {

        @Test
        @DisplayName("Returns lower-cased extension from normal filename")
        void normalFilename() {
            assertThat(service.extractExtension("Exam.PDF")).isEqualTo("pdf");
        }

        @Test
        @DisplayName("Returns empty string when filename has no dot")
        void noDot() {
            assertThat(service.extractExtension("noDot")).isEqualTo("");
        }

        @Test
        @DisplayName("Returns empty string for null filename")
        void nullFilename() {
            assertThat(service.extractExtension(null)).isEqualTo("");
        }
    }

    @Nested
    @DisplayName("basenameWithoutExtension")
    class BasenameTests {

        @Test
        @DisplayName("Strips extension correctly")
        void stripsExtension() {
            assertThat(service.basenameWithoutExtension("exam.pdf")).isEqualTo("exam");
        }

        @Test
        @DisplayName("Returns full name when no dot is present")
        void noDot() {
            assertThat(service.basenameWithoutExtension("exam")).isEqualTo("exam");
        }

        @Test
        @DisplayName("Returns 'file' for null input")
        void nullInput() {
            assertThat(service.basenameWithoutExtension(null)).isEqualTo("file");
        }
    }

    // -------------------------------------------------------------------------
    // Test data factories
    // -------------------------------------------------------------------------

    private byte[] createMinimalPdf(int pages) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < pages; i++) {
                doc.addPage(new PDPage());
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return baos.toByteArray();
        }
    }

    private byte[] createMinimalJpeg(int width, int height, Color color) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "JPEG", baos);
        return baos.toByteArray();
    }

    private byte[] createMinimalPng(int width, int height, Color color) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", baos);
        return baos.toByteArray();
    }

    /** Bytes with a HEIC-like ftyp marker at offset 4 but otherwise invalid content. */
    private byte[] createFakeHeicBytes() {
        byte[] bytes = new byte[16];
        bytes[4] = 0x66; // 'f'
        bytes[5] = 0x74; // 't'
        bytes[6] = 0x79; // 'y'
        bytes[7] = 0x70; // 'p'
        return bytes;
    }
}
