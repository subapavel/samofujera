package cz.samofujera.featureflag;

import cz.samofujera.featureflag.internal.FeatureFlagRepository;
import cz.samofujera.featureflag.internal.FeatureFlagCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FeatureFlagServiceTest {

    @Mock
    private FeatureFlagRepository repository;

    @Mock
    private FeatureFlagCache cache;

    private FeatureFlagService service;

    @BeforeEach
    void setUp() {
        service = new FeatureFlagService(repository, cache);
    }

    @Test
    void isEnabled_returnsCachedValue_whenInCache() {
        when(cache.get("test-flag")).thenReturn(Optional.of(true));

        assertThat(service.isEnabled("test-flag")).isTrue();
    }

    @Test
    void isEnabled_queriesRepository_whenNotInCache() {
        when(cache.get("test-flag")).thenReturn(Optional.empty());
        when(repository.isEnabled("test-flag")).thenReturn(true);

        assertThat(service.isEnabled("test-flag")).isTrue();
        verify(cache).put("test-flag", true);
    }

    @Test
    void isEnabled_returnsFalse_whenFlagNotFound() {
        when(cache.get("unknown-flag")).thenReturn(Optional.empty());
        when(repository.isEnabled("unknown-flag")).thenReturn(false);

        assertThat(service.isEnabled("unknown-flag")).isFalse();
    }
}
