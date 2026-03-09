package cz.samofujera.security.entity;

import io.quarkus.hibernate.reactive.panache.PanacheEntityBase;
import io.smallrye.mutiny.Uni;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "users")
public class UserEntity extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(unique = true, nullable = false)
    public String email;

    @Column(name = "password_hash", nullable = false)
    public String passwordHash;

    @Column(nullable = false)
    public String role;

    @Column(name = "display_name")
    public String displayName;

    @Column(name = "is_active", nullable = false)
    public boolean isActive;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    public Instant updatedAt;

    public static Uni<UserEntity> findByEmail(String email) {
        return find("email", email).firstResult();
    }
}
