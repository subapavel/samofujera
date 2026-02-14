package cz.samofujera.featureflag.internal;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.FEATURE_FLAGS;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Import(TestcontainersConfig.class)
@org.springframework.test.context.ActiveProfiles("test")
class FeatureFlagRepositoryIntegrationTest {

    @Autowired
    private DSLContext dsl;

    private FeatureFlagRepository repository;

    @BeforeEach
    void setUp() {
        repository = new FeatureFlagRepository(dsl);
        dsl.deleteFrom(FEATURE_FLAGS).execute();
    }

    @Test
    void isEnabled_returnsTrue_whenFlagExistsAndEnabled() {
        dsl.insertInto(FEATURE_FLAGS)
            .set(FEATURE_FLAGS.ID, UUID.randomUUID())
            .set(FEATURE_FLAGS.KEY, "test-flag")
            .set(FEATURE_FLAGS.ENABLED, true)
            .execute();

        assertThat(repository.isEnabled("test-flag")).isTrue();
    }

    @Test
    void isEnabled_returnsFalse_whenFlagExistsButDisabled() {
        dsl.insertInto(FEATURE_FLAGS)
            .set(FEATURE_FLAGS.ID, UUID.randomUUID())
            .set(FEATURE_FLAGS.KEY, "disabled-flag")
            .set(FEATURE_FLAGS.ENABLED, false)
            .execute();

        assertThat(repository.isEnabled("disabled-flag")).isFalse();
    }

    @Test
    void isEnabled_returnsFalse_whenFlagDoesNotExist() {
        assertThat(repository.isEnabled("nonexistent")).isFalse();
    }
}
