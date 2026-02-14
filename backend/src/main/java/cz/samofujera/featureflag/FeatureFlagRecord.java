package cz.samofujera.featureflag;

import java.util.UUID;

public record FeatureFlagRecord(
    UUID id,
    String key,
    boolean enabled,
    String description
) {}
