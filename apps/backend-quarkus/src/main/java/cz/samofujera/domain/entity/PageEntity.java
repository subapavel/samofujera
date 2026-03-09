package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pages", schema = "quarkus_poc")
public class PageEntity extends PanacheEntityBase {

    @Id
    @GeneratedValue
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID id;

    @Column(unique = true, nullable = false)
    public String slug;

    @Column(nullable = false)
    public String title;

    @Column(nullable = false)
    public String status;

    @Column(name = "page_type", nullable = false)
    public String pageType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    public String content;

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

    @Column(name = "sort_order", nullable = false)
    public int sortOrder;

    @Column(name = "show_in_nav", nullable = false)
    public boolean showInNav;

    @Column(name = "scheduled_publish_at")
    public Instant scheduledPublishAt;

    @Column(name = "published_revision_id")
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID publishedRevisionId;

    @Column(name = "product_id")
    @JdbcTypeCode(SqlTypes.UUID)
    public UUID productId;

    @Column(name = "created_by")
    public Long createdBy;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @Column(name = "published_at")
    public Instant publishedAt;

    public static Uni<PageEntity> findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }

    public static Uni<PageEntity> findByProductId(UUID productId) {
        return find("productId", productId).firstResult();
    }
}
