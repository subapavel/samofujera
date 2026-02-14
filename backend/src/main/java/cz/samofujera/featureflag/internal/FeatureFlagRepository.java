package cz.samofujera.featureflag.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import static cz.samofujera.generated.jooq.Tables.FEATURE_FLAGS;

@Repository
public class FeatureFlagRepository {

    private final DSLContext dsl;

    FeatureFlagRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public boolean isEnabled(String key) {
        return Boolean.TRUE.equals(
            dsl.select(FEATURE_FLAGS.ENABLED)
               .from(FEATURE_FLAGS)
               .where(FEATURE_FLAGS.KEY.eq(key))
               .fetchOne(FEATURE_FLAGS.ENABLED)
        );
    }
}
