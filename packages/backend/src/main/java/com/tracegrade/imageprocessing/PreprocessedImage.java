package com.tracegrade.imageprocessing;

/**
 * Immutable result of preprocessing a single image.
 * A multi-page PDF produces multiple PreprocessedImage instances (one per page).
 */
public record PreprocessedImage(
        String filename,
        byte[] content,
        String contentType,
        String format) {
}
