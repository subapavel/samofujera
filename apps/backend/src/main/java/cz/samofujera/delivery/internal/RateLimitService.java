package cz.samofujera.delivery.internal;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
public class RateLimitService {

    private final StringRedisTemplate redisTemplate;

    RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isRateLimited(UUID userId, int maxPerHour) {
        String key = "download:rate:" + userId;
        var count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofHours(1));
        }
        return count != null && count > maxPerHour;
    }
}
