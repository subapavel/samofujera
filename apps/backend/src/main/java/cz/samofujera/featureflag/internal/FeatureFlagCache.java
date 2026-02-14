package cz.samofujera.featureflag.internal;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
public class FeatureFlagCache {

    private static final String PREFIX = "ff:";
    private static final Duration TTL = Duration.ofMinutes(5);

    private final StringRedisTemplate redis;

    FeatureFlagCache(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public Optional<Boolean> get(String key) {
        String value = redis.opsForValue().get(PREFIX + key);
        if (value == null) {
            return Optional.empty();
        }
        return Optional.of(Boolean.parseBoolean(value));
    }

    public void put(String key, boolean enabled) {
        redis.opsForValue().set(PREFIX + key, String.valueOf(enabled), TTL);
    }
}
