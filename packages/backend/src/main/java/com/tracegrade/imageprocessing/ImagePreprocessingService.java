package com.tracegrade.imageprocessing;

import java.util.List;

/**
 * Preprocesses uploaded exam images before they are stored.
 * <ul>
 *   <li>HEIC → JPG conversion</li>
 *   <li>PDF → one PNG per page</li>
 *   <li>Rotation correction (EXIF) and contrast enhancement for all formats</li>
 * </ul>
 */
public interface ImagePreprocessingService {

    /**
     * Preprocesses the given file and returns one or more processed images.
     *
     * @param filename    original file name (used to detect format and build output names)
     * @param content     raw file bytes
     * @param contentType MIME type reported by the upload (may be {@code null})
     * @return non-empty list of preprocessed images; multi-page PDFs yield one entry per page
     * @throws PreprocessingException if the file cannot be decoded or converted
     */
    List<PreprocessedImage> preprocess(String filename, byte[] content, String contentType);
}
