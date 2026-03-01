package com.tracegrade.imageprocessing;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.awt.image.ImagingOpException;
import java.awt.image.RescaleOp;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;

import lombok.extern.slf4j.Slf4j;

/**
 * In-process image preprocessing pipeline.
 *
 * <ul>
 *   <li><b>HEIC → JPG</b>: Requires the TwelveMonkeys {@code imageio-heif} plugin and the
 *       native {@code libheif} system package to be installed. Without these, a
 *       {@link PreprocessingException} is thrown with an actionable message.</li>
 *   <li><b>PDF → PNG</b>: Each page is rendered at 200 DPI via Apache PDFBox.</li>
 *   <li><b>JPEG / PNG</b>: EXIF orientation is applied and contrast is boosted.</li>
 * </ul>
 */
@Slf4j
@Service
public class ImagePreprocessingServiceImpl implements ImagePreprocessingService {

    private static final float CONTRAST_SCALE = 1.15f;
    private static final float CONTRAST_OFFSET = 10.0f;
    private static final float PDF_RENDER_DPI = 200f;

    @Override
    public List<PreprocessedImage> preprocess(String filename, byte[] content, String contentType) {
        String ext = extractExtension(filename);

        return switch (ext) {
            case "pdf" -> preprocessPdf(filename, content);
            case "heic", "heif" -> List.of(preprocessHeic(filename, content));
            default -> List.of(preprocessRasterImage(filename, content, ext));
        };
    }

    // -------------------------------------------------------------------------
    // Format-specific handlers
    // -------------------------------------------------------------------------

    private List<PreprocessedImage> preprocessPdf(String filename, byte[] content) {
        try (PDDocument doc = Loader.loadPDF(content)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int pageCount = doc.getNumberOfPages();
            List<PreprocessedImage> pages = new ArrayList<>(pageCount);
            String base = basenameWithoutExtension(filename);

            for (int i = 0; i < pageCount; i++) {
                BufferedImage pageImage = renderer.renderImageWithDPI(i, PDF_RENDER_DPI);
                pageImage = enhanceContrast(pageImage);
                byte[] pngBytes = encodeImage(pageImage, "PNG");
                String pageFilename = base + "_page" + (i + 1) + ".png";
                pages.add(new PreprocessedImage(pageFilename, pngBytes, "image/png", "png"));
            }

            log.debug("PDF '{}' converted to {} PNG page(s)", filename, pageCount);
            return pages;
        } catch (IOException e) {
            throw new PreprocessingException("pdf", "Failed to process PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Converts a HEIC/HEIF file to JPG.
     * Requires TwelveMonkeys {@code imageio-heif} and native {@code libheif}.
     */
    private PreprocessedImage preprocessHeic(String filename, byte[] content) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
            if (image == null) {
                throw new PreprocessingException(
                        "heic",
                        "HEIC/HEIF conversion requires native libheif support. "
                                + "Install the libheif system package and add the "
                                + "TwelveMonkeys imageio-heif plugin to the classpath.");
            }
            image = enhanceContrast(image);
            byte[] jpegBytes = encodeImage(image, "JPEG");
            String outFilename = basenameWithoutExtension(filename) + ".jpg";
            log.debug("HEIC '{}' converted to JPG", filename);
            return new PreprocessedImage(outFilename, jpegBytes, "image/jpeg", "jpg");
        } catch (IOException e) {
            throw new PreprocessingException("heic", "Failed to convert HEIC: " + e.getMessage(), e);
        }
    }

    private PreprocessedImage preprocessRasterImage(String filename, byte[] content, String ext) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(content));
            if (image == null) {
                throw new PreprocessingException(ext, "Unreadable image file: " + filename);
            }
            image = applyExifRotation(image, content);
            image = enhanceContrast(image);
            String ioFormat = "jpg".equals(ext) ? "JPEG" : ext.toUpperCase();
            String mimeType = "jpg".equals(ext) ? "image/jpeg" : "image/" + ext;
            byte[] outBytes = encodeImage(image, ioFormat);
            log.debug("Image '{}' preprocessed (rotation + contrast)", filename);
            return new PreprocessedImage(filename, outBytes, mimeType, ext);
        } catch (IOException e) {
            throw new PreprocessingException(ext, "Failed to preprocess image: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Image enhancement
    // -------------------------------------------------------------------------

    /**
     * Boosts contrast by applying a linear scale + offset via {@link RescaleOp}.
     * Images with an alpha channel are first composited onto white to avoid
     * {@link ImagingOpException} from the RescaleOp.
     */
    BufferedImage enhanceContrast(BufferedImage src) {
        BufferedImage rgb = toRgb(src);
        try {
            RescaleOp op = new RescaleOp(CONTRAST_SCALE, CONTRAST_OFFSET, null);
            return op.filter(rgb, null);
        } catch (ImagingOpException e) {
            log.warn("Contrast enhancement failed for image type {}, returning original: {}",
                    src.getType(), e.getMessage());
            return src;
        }
    }

    /**
     * Reads EXIF orientation from JPEG bytes and rotates the image accordingly.
     * Non-JPEG formats or images without EXIF data are returned unchanged.
     */
    BufferedImage applyExifRotation(BufferedImage image, byte[] content) {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(content));
            ExifIFD0Directory dir = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (dir == null || !dir.containsTag(ExifIFD0Directory.TAG_ORIENTATION)) {
                return image;
            }
            int orientation = dir.getInt(ExifIFD0Directory.TAG_ORIENTATION);
            return rotateForOrientation(image, orientation);
        } catch (Exception e) {
            log.debug("EXIF orientation unreadable for image, skipping rotation: {}", e.getMessage());
            return image;
        }
    }

    /**
     * Rotates a BufferedImage to match the specified EXIF orientation value.
     *
     * @param src         source image
     * @param orientation EXIF orientation (1=normal, 3=180°, 6=90°CW, 8=90°CCW)
     */
    BufferedImage rotateForOrientation(BufferedImage src, int orientation) {
        double angle = switch (orientation) {
            case 3 -> Math.PI;         // 180°
            case 6 -> Math.PI / 2;     // 90° clockwise
            case 8 -> -Math.PI / 2;    // 90° counter-clockwise
            default -> 0;
        };

        if (angle == 0) {
            return src;
        }

        boolean swapDims = (orientation == 6 || orientation == 8);
        int srcW = src.getWidth();
        int srcH = src.getHeight();
        int dstW = swapDims ? srcH : srcW;
        int dstH = swapDims ? srcW : srcH;

        int type = src.getType() == 0 ? BufferedImage.TYPE_INT_ARGB : src.getType();
        BufferedImage rotated = new BufferedImage(dstW, dstH, type);
        Graphics2D g2d = rotated.createGraphics();
        AffineTransform at = new AffineTransform();
        at.translate(dstW / 2.0, dstH / 2.0);
        at.rotate(angle);
        at.translate(-srcW / 2.0, -srcH / 2.0);
        g2d.drawImage(src, at, null);
        g2d.dispose();
        return rotated;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private BufferedImage toRgb(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_INT_RGB
                || src.getType() == BufferedImage.TYPE_3BYTE_BGR) {
            return src;
        }
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, src.getWidth(), src.getHeight());
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private byte[] encodeImage(BufferedImage image, String formatName) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        boolean written = ImageIO.write(image, formatName, baos);
        if (!written) {
            throw new IOException("No ImageIO writer found for format: " + formatName);
        }
        return baos.toByteArray();
    }

    /** Returns the lower-cased extension of {@code filename}, or {@code ""} if absent. */
    String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    /** Returns the filename stem (without extension), or the full name if no dot is found. */
    String basenameWithoutExtension(String filename) {
        if (filename == null) {
            return "file";
        }
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }
}
