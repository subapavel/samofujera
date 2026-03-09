package cz.samofujera.domain.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "email_template_overrides")
public class EmailTemplateOverrideEntity extends PanacheEntityBase {

    @Id
    @Column(columnDefinition = "uuid")
    public UUID id;

    @Column(name = "template_key", nullable = false)
    public String templateKey;

    @Column(nullable = false)
    public String locale;

    @Column(name = "custom_subject")
    public String customSubject;

    @Column(name = "custom_body_html", columnDefinition = "text")
    public String customBodyHtml;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
    }

    public static Uni<EmailTemplateOverrideEntity> findByKeyAndLocale(String templateKey, String locale) {
        return find("templateKey = ?1 AND locale = ?2", templateKey, locale).firstResult();
    }

    public static Uni<List<EmailTemplateOverrideEntity>> findByKey(String templateKey) {
        return list("templateKey", templateKey);
    }

    public static Uni<Long> deleteByKeyAndLocale(String templateKey, String locale) {
        return delete("templateKey = ?1 AND locale = ?2", templateKey, locale);
    }
}
