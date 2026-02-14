package cz.samofujera.featureflag;

import cz.samofujera.featureflag.internal.FeatureFlagCache;
import cz.samofujera.featureflag.internal.FeatureFlagRepository;
import org.springframework.stereotype.Service;

@Service
public class FeatureFlagService {

    private final FeatureFlagRepository repository;
    private final FeatureFlagCache cache;

    FeatureFlagService(FeatureFlagRepository repository, FeatureFlagCache cache) {
        this.repository = repository;
        this.cache = cache;
    }

    public boolean isEnabled(String key) {
        return cache.get(key)
            .orElseGet(() -> {
                boolean enabled = repository.isEnabled(key);
                cache.put(key, enabled);
                return enabled;
            });
    }
}
