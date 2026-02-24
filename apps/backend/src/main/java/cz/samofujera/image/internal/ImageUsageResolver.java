package cz.samofujera.image.internal;

import cz.samofujera.image.ImageDtos;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class ImageUsageResolver {

    private static final Pattern MEDIA_ITEM_ID_PATTERN =
        Pattern.compile("\"mediaItemId\"\\s*:\\s*\"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\"");

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

        // Pages — OG image
        var pagesOg = dsl.select(
                DSL.field("pg2.id", UUID.class),
                DSL.field("pg2.title", String.class))
            .from(DSL.table("pages").as("pg2"))
            .where(DSL.field("pg2.og_image_id", UUID.class).eq(imageId))
            .fetch();
        for (var r : pagesOg) {
            result.add(new ImageDtos.UsageInfo("page_og", r.value1(), r.value2()));
        }

        // Pages — content blocks with mediaItemId
        var idStr = imageId.toString();
        var pagesContent = dsl.select(
                DSL.field("p2.id", UUID.class),
                DSL.field("p2.title", String.class),
                DSL.field("p2.content", JSONB.class))
            .from(DSL.table("pages").as("p2"))
            .where(DSL.field("p2.content", JSONB.class).isNotNull())
            .fetch();
        for (var r : pagesContent) {
            var content = r.value3();
            if (content != null && content.data().contains(idStr)) {
                var matcher = MEDIA_ITEM_ID_PATTERN.matcher(content.data());
                while (matcher.find()) {
                    if (matcher.group(1).equals(idStr)) {
                        result.add(new ImageDtos.UsageInfo("page", r.value1(), r.value2()));
                        break;
                    }
                }
            }
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

        // Pages — OG images
        var pagesOg = dsl.select(
                DSL.field("pg2.og_image_id", UUID.class),
                DSL.field("pg2.id", UUID.class),
                DSL.field("pg2.title", String.class))
            .from(DSL.table("pages").as("pg2"))
            .where(DSL.field("pg2.og_image_id", UUID.class).in(imageIds))
            .fetch();
        for (var r : pagesOg) {
            result.computeIfAbsent(r.value1(), k -> new ArrayList<>())
                .add(new ImageDtos.UsageInfo("page_og", r.value2(), r.value3()));
        }

        // Pages — content blocks with mediaItemId
        var imageIdStrings = new HashSet<String>();
        for (var id : imageIds) {
            imageIdStrings.add(id.toString());
        }
        var pagesContent = dsl.select(
                DSL.field("p2.id", UUID.class),
                DSL.field("p2.title", String.class),
                DSL.field("p2.content", JSONB.class))
            .from(DSL.table("pages").as("p2"))
            .where(DSL.field("p2.content", JSONB.class).isNotNull())
            .fetch();
        for (var r : pagesContent) {
            var content = r.value3();
            if (content == null) continue;
            var data = content.data();
            var matcher = MEDIA_ITEM_ID_PATTERN.matcher(data);
            var matchedForPage = new HashSet<UUID>();
            while (matcher.find()) {
                var matchedId = matcher.group(1);
                if (imageIdStrings.contains(matchedId)) {
                    var imageUuid = UUID.fromString(matchedId);
                    if (matchedForPage.add(imageUuid)) {
                        result.computeIfAbsent(imageUuid, k -> new ArrayList<>())
                            .add(new ImageDtos.UsageInfo("page", r.value1(), r.value2()));
                    }
                }
            }
        }

        return result;
    }
}
