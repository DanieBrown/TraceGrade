package com.tracegrade.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class FlywayMigrationIntegrityTest {

    private static final Pattern VERSIONED_MIGRATION = Pattern.compile("^V(\\d+)__.+\\.sql$");

    @Test
    @DisplayName("Should keep Flyway migration versions contiguous across configured locations")
    void migrationVersionsAreContiguous() throws IOException {
        SortedSet<Integer> versions = new TreeSet<>();

        for (Path location : migrationLocations()) {
            try (Stream<Path> files = Files.list(location)) {
                files.filter(Files::isRegularFile)
                        .map(Path::getFileName)
                        .map(Path::toString)
                        .map(VERSIONED_MIGRATION::matcher)
                        .filter(Matcher::matches)
                        .map(matcher -> Integer.parseInt(matcher.group(1)))
                        .forEach(versions::add);
            }
        }

        assertThat(versions).isNotEmpty();

        List<Integer> expectedVersions = IntStream.rangeClosed(versions.first(), versions.last())
                .boxed()
                .toList();

        assertThat(new ArrayList<>(versions))
                .as("Flyway migration versions across configured locations")
                .containsExactlyElementsOf(expectedVersions);
    }

    private List<Path> migrationLocations() {
        return List.of(
                Path.of("src", "main", "resources", "db", "migration"),
                Path.of("src", "main", "resources", "db", "dev-migration"));
    }
}