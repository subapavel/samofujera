package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.quarkus.panache.common.Sort;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "page_revisions", schema = "quarkus_poc")
public class PageRevisionEntity extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID id;

    @Column(name = "page_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID pageId;

    @Column(nullable = false)
    public int version;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String content;

    public String title;

    public String slug;

    @Column(name = "meta_title")
    public String metaTitle;

    @Column(name = "meta_description")
    public String metaDescription;

    @Column(name = "meta_keywords")
    public String metaKeywords;

    @Column(name = "og_title")
    public String ogTitle;

    @Column(name = "og_description")
    public String ogDescription;

    @Column(name = "og_image_id")
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID ogImageId;

    @Column(nullable = false)
    public boolean noindex;

    @Column(nullable = false)
    public boolean nofollow;

    @Column(name = "created_by")
    public Long createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    public static Uni<List<PageRevisionEntity>> findByPageId(UUID pageId) {
        return list("pageId", Sort.by("version", Sort.Direction.Descending), pageId);
    }

    public static Uni<Integer> findMaxVersion(UUID pageId) {
        return find("pageId", Sort.by("version", Sort.Direction.Descending), pageId)
                .firstResult()
                .map(r -> r == null ? 0 : ((PageRevisionEntity) r).version);
    }
}
