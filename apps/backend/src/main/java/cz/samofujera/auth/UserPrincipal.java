package cz.samofujera.auth;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String name;
    private final String passwordHash;
    private final Set<String> roles;
    private final boolean blocked;
    private final boolean deleted;

    public UserPrincipal(UUID id, String email, String name, String passwordHash,
                         Set<String> roles, boolean blocked, boolean deleted) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.roles = Set.copyOf(roles);
        this.blocked = blocked;
        this.deleted = deleted;
    }

    public UUID getId() { return id; }

    public String getName() { return name; }

    public Set<String> getRoles() { return roles; }

    public boolean hasRole(String role) { return roles.contains(role); }

    @Override
    public String getUsername() { return email; }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public boolean isAccountNonLocked() { return !blocked; }

    @Override
    public boolean isEnabled() { return !deleted; }
}
