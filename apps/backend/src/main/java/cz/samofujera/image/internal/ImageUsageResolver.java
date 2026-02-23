package cz.samofujera.image.internal;

import cz.samofujera.image.ImageDtos;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
class ImageUsageResolver {

    private final DSLContext dsl;

    ImageUsageResolver(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ImageDtos.UsageInfo> findUsages(UUID imageId) {
        var result = new ArrayList<ImageDtos.UsageInfo>();

        // Products via product_gallery
        var products = dsl.select(
                DSL.field("p.id", UUID.class),
                DSL.field("p.title", String.class))
            .from(DSL.table("product_gallery").as("pg"))
            .join(DSL.table("products").as("p")).on(DSL.field("pg.product_id", UUID.class).eq(DSL.field("p.id", UUID.class)))
            .where(DSL.field("pg.image_id", UUID.class).eq(imageId))
            .fetch();
        for (var r : products) {
            result.add(new ImageDtos.UsageInfo("product", r.value1(), r.value2()));
        }

        // Categories
        var categories = dsl.select(
                DSL.field("pc.id", UUID.class),
                DSL.field("pc.name", String.class))
            .from(DSL.table("product_categories").as("pc"))
            .where(DSL.field("pc.image_id", UUID.class).eq(imageId))
            .fetch();
        for (var r : categories) {
            result.add(new ImageDtos.UsageInfo("category", r.value1(), r.value2()));
        }

        return result;
    }

    public Map<UUID, List<ImageDtos.UsageInfo>> findUsagesBulk(List<UUID> imageIds) {
        if (imageIds.isEmpty()) return Map.of();

        var result = new HashMap<UUID, List<ImageDtos.UsageInfo>>();
        for (var id : imageIds) {
            result.put(id, new ArrayList<>());
        }

        // Products
        var products = dsl.select(
                DSL.field("pg.image_id", UUID.class),
                DSL.field("p.id", UUID.class),
                DSL.field("p.title", String.class))
            .from(DSL.table("product_gallery").as("pg"))
            .join(DSL.table("products").as("p")).on(DSL.field("pg.product_id", UUID.class).eq(DSL.field("p.id", UUID.class)))
            .where(DSL.field("pg.image_id", UUID.class).in(imageIds))
            .fetch();
        for (var r : products) {
            result.computeIfAbsent(r.value1(), k -> new ArrayList<>())
                .add(new ImageDtos.UsageInfo("product", r.value2(), r.value3()));
        }

        // Categories
        var categories = dsl.select(
                DSL.field("pc.image_id", UUID.class),
                DSL.field("pc.id", UUID.class),
                DSL.field("pc.name", String.class))
            .from(DSL.table("product_categories").as("pc"))
            .where(DSL.field("pc.image_id", UUID.class).in(imageIds))
            .fetch();
        for (var r : categories) {
            result.computeIfAbsent(r.value1(), k -> new ArrayList<>())
                .add(new ImageDtos.UsageInfo("category", r.value2(), r.value3()));
        }

        return result;
    }
}
