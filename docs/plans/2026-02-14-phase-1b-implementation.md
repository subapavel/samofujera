# Phase 1B — Auth, Frontend & CI/CD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the foundation with authentication, email, frontend app shells, and CI/CD pipelines — delivering a functional auth flow end-to-end.

**Architecture:** Spring Security 7 + Spring Session Redis for auth. Spring Modulith event-driven email. Astro public site with React islands for auth forms. React SPAs (admin + customer dashboard) with TanStack Router/Query. GitHub Actions CI/CD. Pre-compiled React Email templates.

**Tech Stack:** Java 25, Spring Boot 4.0.2, Spring Security 7, Spring Session, JOOQ, Flyway, Astro, React 19, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS 4, Lingui, Playwright, Vitest, GitHub Actions

**Prerequisites:** Docker Desktop running. Java 25 JDK. pnpm installed. Node.js 20+. Phase 1A completed (backend skeleton, Docker Compose, monorepo root).

---

## PART A: BACKEND AUTH

---

### Task 1: Add Backend Dependencies

**Files:**
- Modify: `backend/pom.xml`

**Step 1: Add Spring Security, Spring Session, Mail, and test dependencies**

Add to `<dependencies>` section in `backend/pom.xml`:

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Spring Session Redis -->
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>

<!-- Mail -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

Add to test `<dependencies>`:

```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

**Step 2: Update application.yml**

Add to `backend/src/main/resources/application.yml`:

```yaml
spring:
  session:
    store-type: redis
    redis:
      namespace: samofujera:session
    timeout: 30d
  security:
    filter:
      order: -100
```

**Step 3: Update application-dev.yml**

Add to `backend/src/main/resources/application-dev.yml`:

```yaml
spring:
  mail:
    host: localhost
    port: 1025
```

**Step 4: Verify compilation**

Run: `cd backend && ./mvnw compile`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/
git commit -m "build(backend): add spring security, session, mail and validation dependencies"
```

---

### Task 2: Flyway Migrations + JOOQ Regen

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__create_user_sessions_table.sql`
- Create: `backend/src/main/resources/db/migration/V4__create_password_reset_tokens_table.sql`

**Step 1: Create V3 — user_sessions table**

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    device_fingerprint VARCHAR(255),
    device_name VARCHAR(255),
    ip_address VARCHAR(45),
    last_active_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id, last_active_at DESC);
```

**Step 2: Create V4 — password_reset_tokens table**

```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_password_reset_token ON password_reset_tokens(token) WHERE used_at IS NULL;
```

**Step 3: Run compile to regenerate JOOQ classes**

Run: `cd backend && ./mvnw compile`
Expected: JOOQ generates `UserSessions.java`, `PasswordResetTokens.java` + records.

**Step 4: Verify generated classes**

Check that `target/generated-sources/jooq/cz/samofujera/generated/jooq/tables/` contains:
- `Users.java`, `FeatureFlags.java` (existing)
- `UserSessions.java` (new)
- `PasswordResetTokens.java` (new)

**Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/
git commit -m "feat(backend): add user_sessions and password_reset_tokens migrations"
```

---

### Task 3: Spring Security Configuration

**Files:**
- Create: `backend/src/main/java/cz/samofujera/auth/internal/SecurityConfig.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/CustomUserDetailsService.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/UserPrincipal.java`
- Modify: `backend/src/main/resources/application.yml` (CORS config)

**Step 1: Create UserPrincipal**

```java
package cz.samofujera.auth.internal;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String passwordHash;
    private final String role;
    private final boolean blocked;
    private final boolean deleted;

    public UserPrincipal(UUID id, String email, String passwordHash,
                         String role, boolean blocked, boolean deleted) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.blocked = blocked;
        this.deleted = deleted;
    }

    public UUID getId() { return id; }

    @Override
    public String getUsername() { return email; }

    @Override
    public String getPassword() { return passwordHash; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public boolean isAccountNonLocked() { return !blocked; }

    @Override
    public boolean isEnabled() { return !deleted; }
}
```

**Step 2: Create CustomUserDetailsService**

```java
package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Service
class CustomUserDetailsService implements UserDetailsService {

    private final DSLContext dsl;

    CustomUserDetailsService(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var record = dsl.selectFrom(USERS)
                .where(USERS.EMAIL.eq(email))
                .and(USERS.DELETED_AT.isNull())
                .fetchOne();

        if (record == null) {
            throw new UsernameNotFoundException("User not found: " + email);
        }

        return new UserPrincipal(
                record.getId(),
                record.getEmail(),
                record.getPasswordHash(),
                record.getRole(),
                record.getBlockedAt() != null,
                false
        );
    }
}
```

**Step 3: Create SecurityConfig**

```java
package cz.samofujera.auth.internal;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, authEx) ->
                    res.sendError(HttpStatus.UNAUTHORIZED.value()))
                .accessDeniedHandler((req, res, accessEx) ->
                    res.sendError(HttpStatus.FORBIDDEN.value()))
            )
            .logout(logout -> logout.disable());

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4321", "http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

**Step 4: Verify compilation**

Run: `cd backend && ./mvnw compile`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add backend/src/main/java/cz/samofujera/auth/
git commit -m "feat(backend): add spring security configuration with session auth"
```

---

### Task 4: Auth Module — Registration

**Files:**
- Create: `backend/src/main/java/cz/samofujera/auth/AuthService.java`
- Create: `backend/src/main/java/cz/samofujera/auth/AuthController.java`
- Create: `backend/src/main/java/cz/samofujera/auth/AuthDtos.java`
- Create: `backend/src/main/java/cz/samofujera/auth/event/UserRegisteredEvent.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/AuthUserRepository.java`
- Create: `backend/src/test/java/cz/samofujera/auth/AuthServiceTest.java`
- Create: `backend/src/test/java/cz/samofujera/auth/AuthControllerIntegrationTest.java`

**Step 1: Create DTOs**

```java
package cz.samofujera.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String name
    ) {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        String deviceFingerprint,
        boolean force
    ) {}

    public record ForgotPasswordRequest(
        @NotBlank @Email String email
    ) {}

    public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8) String newPassword
    ) {}

    public record UserResponse(
        UUID id,
        String email,
        String name,
        String role,
        String locale
    ) {}

    public record SessionConflictResponse(
        boolean conflict,
        String existingDevice,
        String sessionId
    ) {}
}
```

**Step 2: Create domain event**

```java
package cz.samofujera.auth.event;

import java.util.UUID;

public record UserRegisteredEvent(UUID userId, String email, String name) {}
```

**Step 3: Create AuthUserRepository**

```java
package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Repository
public class AuthUserRepository {

    private final DSLContext dsl;

    AuthUserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public boolean existsByEmail(String email) {
        return dsl.fetchExists(
            dsl.selectFrom(USERS)
               .where(USERS.EMAIL.eq(email))
               .and(USERS.DELETED_AT.isNull())
        );
    }

    public UUID create(String email, String passwordHash, String name) {
        return dsl.insertInto(USERS)
            .set(USERS.EMAIL, email)
            .set(USERS.PASSWORD_HASH, passwordHash)
            .set(USERS.NAME, name)
            .set(USERS.ROLE, "USER")
            .set(USERS.LOCALE, "cs")
            .returning(USERS.ID)
            .fetchOne()
            .getId();
    }
}
```

**Step 4: Write failing AuthService unit test**

```java
package cz.samofujera.auth;

import cz.samofujera.auth.internal.AuthUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private AuthUserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private ApplicationEventPublisher eventPublisher;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, eventPublisher);
    }

    @Test
    void register_createsUser_andPublishesEvent() {
        var request = new AuthDtos.RegisterRequest("test@example.com", "password123", "Test User");
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.create("test@example.com", "hashed", "Test User"))
            .thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000001"));

        var result = authService.register(request);

        assertThat(result.email()).isEqualTo("test@example.com");
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    void register_throwsException_whenEmailExists() {
        var request = new AuthDtos.RegisterRequest("exists@example.com", "password123", "Test");
        when(userRepository.existsByEmail("exists@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email");
    }
}
```

**Step 5: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceTest`
Expected: FAIL — `AuthService` class doesn't exist yet.

**Step 6: Create AuthService (minimal — just registration)**

```java
package cz.samofujera.auth;

import cz.samofujera.auth.event.UserRegisteredEvent;
import cz.samofujera.auth.internal.AuthUserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    AuthService(AuthUserRepository userRepository,
                PasswordEncoder passwordEncoder,
                ApplicationEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }

    public AuthDtos.UserResponse register(AuthDtos.RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        var hash = passwordEncoder.encode(request.password());
        var userId = userRepository.create(request.email(), hash, request.name());

        eventPublisher.publishEvent(new UserRegisteredEvent(userId, request.email(), request.name()));

        return new AuthDtos.UserResponse(userId, request.email(), request.name(), "USER", "cs");
    }
}
```

**Step 7: Create AuthController (register endpoint)**

```java
package cz.samofujera.auth;

import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthDtos.UserResponse>> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {
        var user = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(user));
    }
}
```

**Step 8: Run unit tests**

Run: `cd backend && ./mvnw test -Dtest=AuthServiceTest`
Expected: PASS (2 tests)

**Step 9: Write integration test**

```java
package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void register_returns201_withValidData() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "new@example.com", "password": "password123", "name": "New User"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.email").value("new@example.com"))
            .andExpect(jsonPath("$.data.name").value("New User"))
            .andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    void register_returns400_withDuplicateEmail() throws Exception {
        // First registration
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "dup@example.com", "password": "password123", "name": "User"}
                    """))
            .andExpect(status().isCreated());

        // Duplicate
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "dup@example.com", "password": "password123", "name": "User"}
                    """))
            .andExpect(status().isBadRequest());
    }
}
```

**Step 10: Run all tests**

Run: `cd backend && ./mvnw test`
Expected: All tests pass.

**Step 11: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add auth registration with tests"
```

---

### Task 5: Auth Module — Login with Device Tracking

**Files:**
- Create: `backend/src/main/java/cz/samofujera/auth/internal/SessionTrackingService.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/DeviceFingerprintService.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/SessionRepository.java`
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthService.java` (add login method)
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthController.java` (add login endpoint)
- Create: `backend/src/test/java/cz/samofujera/auth/LoginIntegrationTest.java`

**Step 1: Create DeviceFingerprintService**

```java
package cz.samofujera.auth.internal;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class DeviceFingerprintService {

    public String generate(HttpServletRequest request) {
        var ua = request.getHeader("User-Agent");
        var lang = request.getHeader("Accept-Language");
        var custom = request.getHeader("X-Device-Fingerprint");

        var raw = String.join("|",
            ua != null ? ua : "",
            lang != null ? lang : "",
            custom != null ? custom : ""
        );

        try {
            var digest = MessageDigest.getInstance("SHA-256");
            var hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 32);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public String extractDeviceName(HttpServletRequest request) {
        var ua = request.getHeader("User-Agent");
        if (ua == null) return "Unknown device";
        if (ua.contains("Chrome")) return "Chrome";
        if (ua.contains("Firefox")) return "Firefox";
        if (ua.contains("Safari")) return "Safari";
        if (ua.contains("Edge")) return "Edge";
        return "Unknown browser";
    }
}
```

**Step 2: Create SessionRepository (JOOQ)**

```java
package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USER_SESSIONS;

@Repository
public class SessionRepository {

    private final DSLContext dsl;

    SessionRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public int countByUser(UUID userId) {
        return dsl.fetchCount(USER_SESSIONS, USER_SESSIONS.USER_ID.eq(userId));
    }

    public List<SessionInfo> findByUser(UUID userId) {
        return dsl.selectFrom(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .orderBy(USER_SESSIONS.LAST_ACTIVE_AT.desc())
            .fetch(r -> new SessionInfo(
                r.getSessionId(),
                r.getDeviceName(),
                r.getIpAddress(),
                r.getLastActiveAt(),
                r.getCreatedAt()
            ));
    }

    public void create(String sessionId, UUID userId, String fingerprint,
                       String deviceName, String ipAddress) {
        dsl.insertInto(USER_SESSIONS)
            .set(USER_SESSIONS.SESSION_ID, sessionId)
            .set(USER_SESSIONS.USER_ID, userId)
            .set(USER_SESSIONS.DEVICE_FINGERPRINT, fingerprint)
            .set(USER_SESSIONS.DEVICE_NAME, deviceName)
            .set(USER_SESSIONS.IP_ADDRESS, ipAddress)
            .execute();
    }

    public void delete(String sessionId) {
        dsl.deleteFrom(USER_SESSIONS)
            .where(USER_SESSIONS.SESSION_ID.eq(sessionId))
            .execute();
    }

    public void deleteAllByUser(UUID userId) {
        dsl.deleteFrom(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .execute();
    }

    public String findOldestSessionId(UUID userId) {
        return dsl.select(USER_SESSIONS.SESSION_ID)
            .from(USER_SESSIONS)
            .where(USER_SESSIONS.USER_ID.eq(userId))
            .orderBy(USER_SESSIONS.LAST_ACTIVE_AT.asc())
            .limit(1)
            .fetchOne(USER_SESSIONS.SESSION_ID);
    }

    public record SessionInfo(
        String sessionId,
        String deviceName,
        String ipAddress,
        LocalDateTime lastActiveAt,
        LocalDateTime createdAt
    ) {}
}
```

**Step 3: Create SessionTrackingService**

```java
package cz.samofujera.auth.internal;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SessionTrackingService {

    private static final int MAX_SESSIONS = 3;

    private final SessionRepository sessionRepository;
    private final DeviceFingerprintService fingerprintService;
    private final FindByIndexNameSessionRepository<? extends Session> springSessionRepository;

    SessionTrackingService(SessionRepository sessionRepository,
                           DeviceFingerprintService fingerprintService,
                           FindByIndexNameSessionRepository<? extends Session> springSessionRepository) {
        this.sessionRepository = sessionRepository;
        this.fingerprintService = fingerprintService;
        this.springSessionRepository = springSessionRepository;
    }

    public SessionCheckResult checkAndTrack(UUID userId, HttpServletRequest request, boolean force) {
        int activeCount = sessionRepository.countByUser(userId);

        if (activeCount >= MAX_SESSIONS && !force) {
            var sessions = sessionRepository.findByUser(userId);
            var oldest = sessions.getLast();
            return new SessionCheckResult(true, oldest.deviceName(), oldest.sessionId());
        }

        if (activeCount >= MAX_SESSIONS && force) {
            var oldestId = sessionRepository.findOldestSessionId(userId);
            if (oldestId != null) {
                springSessionRepository.deleteById(oldestId);
                sessionRepository.delete(oldestId);
            }
        }

        var fingerprint = fingerprintService.generate(request);
        var deviceName = fingerprintService.extractDeviceName(request);
        var ip = request.getRemoteAddr();
        var sessionId = request.getSession().getId();

        sessionRepository.create(sessionId, userId, fingerprint, deviceName, ip);

        return new SessionCheckResult(false, null, null);
    }

    public record SessionCheckResult(boolean conflict, String existingDevice, String sessionId) {}
}
```

**Step 4: Add login method to AuthService**

Add to `AuthService.java`:

```java
public AuthDtos.UserResponse login(AuthDtos.LoginRequest request,
                                    HttpServletRequest httpRequest) {
    var authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(request.email(), request.password())
    );

    var principal = (UserPrincipal) authentication.getPrincipal();
    var trackResult = sessionTrackingService.checkAndTrack(
        principal.getId(), httpRequest, request.force()
    );

    if (trackResult.conflict()) {
        throw new SessionConflictException(trackResult.existingDevice(), trackResult.sessionId());
    }

    SecurityContextHolder.getContext().setAuthentication(authentication);

    return new AuthDtos.UserResponse(
        principal.getId(), principal.getUsername(),
        /* name from DB */ loadUserName(principal.getId()),
        principal.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""),
        "cs"
    );
}
```

Note: This requires adding `AuthenticationManager`, `SessionTrackingService` as constructor dependencies, and creating `SessionConflictException`. Also need a `loadUserName` helper method or pass name through `UserPrincipal`.

**Step 5: Add login endpoint to AuthController**

```java
@PostMapping("/login")
public ResponseEntity<?> login(
        @Valid @RequestBody AuthDtos.LoginRequest request,
        HttpServletRequest httpRequest) {
    try {
        var user = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(user));
    } catch (SessionConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new AuthDtos.SessionConflictResponse(true, ex.getDevice(), ex.getSessionId()));
    }
}
```

**Step 6: Write login integration test**

```java
package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class LoginIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @BeforeEach
    void setUp() throws Exception {
        // Register a test user
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "login@test.com", "password": "password123", "name": "Login Test"}
                    """));
    }

    @Test
    void login_returns200_withValidCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "login@test.com", "password": "password123"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("login@test.com"));
    }

    @Test
    void login_returns401_withBadPassword() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "login@test.com", "password": "wrongpassword"}
                    """))
            .andExpect(status().isUnauthorized());
    }
}
```

**Step 7: Run all tests**

Run: `cd backend && ./mvnw test`
Expected: All tests pass.

**Step 8: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add login with device tracking and session limits"
```

---

### Task 6: Auth Module — Logout + Password Reset

**Files:**
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthService.java`
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthController.java`
- Create: `backend/src/main/java/cz/samofujera/auth/event/PasswordResetRequestedEvent.java`
- Create: `backend/src/main/java/cz/samofujera/auth/internal/PasswordResetTokenRepository.java`
- Create: `backend/src/test/java/cz/samofujera/auth/PasswordResetIntegrationTest.java`

**Step 1: Create PasswordResetRequestedEvent**

```java
package cz.samofujera.auth.event;

import java.util.UUID;

public record PasswordResetRequestedEvent(UUID userId, String email, String token) {}
```

**Step 2: Create PasswordResetTokenRepository**

```java
package cz.samofujera.auth.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.PASSWORD_RESET_TOKENS;

@Repository
public class PasswordResetTokenRepository {

    private final DSLContext dsl;

    PasswordResetTokenRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void create(UUID userId, String token, LocalDateTime expiresAt) {
        dsl.insertInto(PASSWORD_RESET_TOKENS)
            .set(PASSWORD_RESET_TOKENS.USER_ID, userId)
            .set(PASSWORD_RESET_TOKENS.TOKEN, token)
            .set(PASSWORD_RESET_TOKENS.EXPIRES_AT, expiresAt)
            .execute();
    }

    public TokenInfo findValidToken(String token) {
        var record = dsl.selectFrom(PASSWORD_RESET_TOKENS)
            .where(PASSWORD_RESET_TOKENS.TOKEN.eq(token))
            .and(PASSWORD_RESET_TOKENS.USED_AT.isNull())
            .and(PASSWORD_RESET_TOKENS.EXPIRES_AT.gt(LocalDateTime.now()))
            .fetchOne();

        if (record == null) return null;

        return new TokenInfo(record.getId(), record.getUserId());
    }

    public void markUsed(UUID tokenId) {
        dsl.update(PASSWORD_RESET_TOKENS)
            .set(PASSWORD_RESET_TOKENS.USED_AT, LocalDateTime.now())
            .where(PASSWORD_RESET_TOKENS.ID.eq(tokenId))
            .execute();
    }

    public record TokenInfo(UUID tokenId, UUID userId) {}
}
```

**Step 3: Add logout and password reset methods to AuthService**

Add to `AuthService.java`:

```java
public void logout(HttpServletRequest request) {
    var session = request.getSession(false);
    if (session != null) {
        sessionRepository.delete(session.getId());
        session.invalidate();
    }
    SecurityContextHolder.clearContext();
}

public void forgotPassword(AuthDtos.ForgotPasswordRequest request) {
    var user = dsl.selectFrom(USERS)
        .where(USERS.EMAIL.eq(request.email()))
        .and(USERS.DELETED_AT.isNull())
        .fetchOne();

    // Always return success to prevent email enumeration
    if (user == null) return;

    var token = UUID.randomUUID().toString();
    passwordResetTokenRepository.create(user.getId(), token, LocalDateTime.now().plusHours(1));
    eventPublisher.publishEvent(new PasswordResetRequestedEvent(user.getId(), user.getEmail(), token));
}

public void resetPassword(AuthDtos.ResetPasswordRequest request) {
    var tokenInfo = passwordResetTokenRepository.findValidToken(request.token());
    if (tokenInfo == null) {
        throw new IllegalArgumentException("Invalid or expired reset token");
    }

    var hash = passwordEncoder.encode(request.newPassword());
    dsl.update(USERS)
        .set(USERS.PASSWORD_HASH, hash)
        .set(USERS.UPDATED_AT, LocalDateTime.now())
        .where(USERS.ID.eq(tokenInfo.userId()))
        .execute();

    passwordResetTokenRepository.markUsed(tokenInfo.tokenId());
}
```

**Step 4: Add endpoints to AuthController**

```java
@PostMapping("/logout")
public ResponseEntity<Void> logout(HttpServletRequest request) {
    authService.logout(request);
    return ResponseEntity.noContent().build();
}

@PostMapping("/forgot-password")
public ResponseEntity<ApiResponse<String>> forgotPassword(
        @Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
    authService.forgotPassword(request);
    return ResponseEntity.ok(ApiResponse.ok(null, "If the email exists, a reset link was sent"));
}

@PostMapping("/reset-password")
public ResponseEntity<ApiResponse<String>> resetPassword(
        @Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
    authService.resetPassword(request);
    return ResponseEntity.ok(ApiResponse.ok(null, "Password has been reset"));
}
```

**Step 5: Write integration tests**

```java
package cz.samofujera.auth;

import cz.samofujera.TestcontainersConfig;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static cz.samofujera.generated.jooq.Tables.PASSWORD_RESET_TOKENS;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PasswordResetIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DSLContext dsl;

    @Test
    void forgotPassword_returns200_evenForUnknownEmail() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email": "unknown@example.com"}
                    """))
            .andExpect(status().isOk());
    }

    @Test
    void resetPassword_changesPassword_withValidToken() throws Exception {
        // Register user
        mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com", "password": "oldpassword1", "name": "Reset Test"}
                """));

        // Request reset
        mockMvc.perform(post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com"}
                """));

        // Get token from DB
        var token = dsl.select(PASSWORD_RESET_TOKENS.TOKEN)
            .from(PASSWORD_RESET_TOKENS)
            .orderBy(PASSWORD_RESET_TOKENS.CREATED_AT.desc())
            .limit(1)
            .fetchOne(PASSWORD_RESET_TOKENS.TOKEN);

        // Reset password
        mockMvc.perform(post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"token": "%s", "newPassword": "newpassword1"}
                """.formatted(token)))
            .andExpect(status().isOk());

        // Login with new password
        mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "reset@test.com", "password": "newpassword1"}
                """))
            .andExpect(status().isOk());
    }
}
```

**Step 6: Run all tests**

Run: `cd backend && ./mvnw test`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add logout and password reset flow"
```

---

### Task 7: User Module — Profile CRUD

**Files:**
- Create: `backend/src/main/java/cz/samofujera/user/UserService.java`
- Create: `backend/src/main/java/cz/samofujera/user/UserController.java`
- Create: `backend/src/main/java/cz/samofujera/user/UserDtos.java`
- Create: `backend/src/main/java/cz/samofujera/user/internal/UserRepository.java`
- Create: `backend/src/test/java/cz/samofujera/user/UserControllerIntegrationTest.java`

**Step 1: Create UserDtos**

```java
package cz.samofujera.user;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record ProfileResponse(
        UUID id, String email, String name, String role,
        String locale, String avatarUrl
    ) {}

    public record UpdateProfileRequest(
        @NotBlank String name,
        String avatarUrl
    ) {}

    public record UpdateLocaleRequest(
        @NotBlank String locale
    ) {}
}
```

**Step 2: Create UserRepository**

```java
package cz.samofujera.user.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.USERS;

@Repository
public class UserRepository {

    private final DSLContext dsl;

    UserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public UserRecord findById(UUID id) {
        var r = dsl.selectFrom(USERS)
            .where(USERS.ID.eq(id).and(USERS.DELETED_AT.isNull()))
            .fetchOne();
        if (r == null) return null;
        return new UserRecord(r.getId(), r.getEmail(), r.getName(),
            r.getRole(), r.getLocale(), r.getAvatarUrl());
    }

    public void updateProfile(UUID id, String name, String avatarUrl) {
        dsl.update(USERS)
            .set(USERS.NAME, name)
            .set(USERS.AVATAR_URL, avatarUrl)
            .set(USERS.UPDATED_AT, LocalDateTime.now())
            .where(USERS.ID.eq(id))
            .execute();
    }

    public void updateLocale(UUID id, String locale) {
        dsl.update(USERS)
            .set(USERS.LOCALE, locale)
            .set(USERS.UPDATED_AT, LocalDateTime.now())
            .where(USERS.ID.eq(id))
            .execute();
    }

    public record UserRecord(UUID id, String email, String name,
                             String role, String locale, String avatarUrl) {}
}
```

**Step 3: Create UserService and UserController**

```java
package cz.samofujera.user;

import cz.samofujera.auth.internal.UserPrincipal;
import cz.samofujera.shared.exception.NotFoundException;
import cz.samofujera.user.internal.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDtos.ProfileResponse getProfile(UUID userId) {
        var user = userRepository.findById(userId);
        if (user == null) throw new NotFoundException("User not found");
        return new UserDtos.ProfileResponse(
            user.id(), user.email(), user.name(),
            user.role(), user.locale(), user.avatarUrl()
        );
    }

    public UserDtos.ProfileResponse updateProfile(UUID userId, UserDtos.UpdateProfileRequest request) {
        userRepository.updateProfile(userId, request.name(), request.avatarUrl());
        return getProfile(userId);
    }

    public void updateLocale(UUID userId, UserDtos.UpdateLocaleRequest request) {
        userRepository.updateLocale(userId, request.locale());
    }
}
```

```java
package cz.samofujera.user;

import cz.samofujera.auth.internal.UserPrincipal;
import cz.samofujera.shared.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final UserService userService;

    UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<UserDtos.ProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(principal.getId())));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UserDtos.ProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDtos.UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(principal.getId(), request)));
    }

    @PutMapping("/locale")
    public ResponseEntity<Void> updateLocale(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UserDtos.UpdateLocaleRequest request) {
        userService.updateLocale(principal.getId(), request);
        return ResponseEntity.noContent().build();
    }
}
```

**Step 4: Write integration test**

Test `/api/me` requires an authenticated session. Use `@WithMockUser` or register + login in test setup.

```java
package cz.samofujera.user;

import cz.samofujera.TestcontainersConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class UserControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;

    private MockHttpSession loginAndGetSession(String email) throws Exception {
        mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "%s", "password": "password123", "name": "Test User"}
                """.formatted(email)));

        var loginResult = mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"email": "%s", "password": "password123"}
                """.formatted(email)))
            .andReturn();

        return (MockHttpSession) loginResult.getRequest().getSession();
    }

    @Test
    void getProfile_returns200_whenAuthenticated() throws Exception {
        var session = loginAndGetSession("profile@test.com");

        mockMvc.perform(get("/api/me").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.email").value("profile@test.com"));
    }

    @Test
    void getProfile_returns401_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/me"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfile_updatesName() throws Exception {
        var session = loginAndGetSession("update@test.com");

        mockMvc.perform(put("/api/me").session(session)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name": "Updated Name"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Updated Name"));
    }
}
```

**Step 5: Run all tests, commit**

Run: `cd backend && ./mvnw test`

```bash
git add backend/src/
git commit -m "feat(backend): add user profile crud endpoints"
```

---

### Task 8: Session Management + Blocking + GDPR Deletion

**Files:**
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthController.java` (session endpoints)
- Modify: `backend/src/main/java/cz/samofujera/auth/AuthService.java` (session, block, delete methods)
- Create: `backend/src/main/java/cz/samofujera/auth/AdminController.java`
- Create: `backend/src/main/java/cz/samofujera/auth/event/UserBlockedEvent.java`
- Create: `backend/src/main/java/cz/samofujera/auth/event/UserUnblockedEvent.java`
- Create: `backend/src/main/java/cz/samofujera/auth/event/UserDeletedEvent.java`
- Create: `backend/src/test/java/cz/samofujera/auth/SessionManagementIntegrationTest.java`
- Create: `backend/src/test/java/cz/samofujera/auth/AccountBlockingIntegrationTest.java`

**Step 1: Create events**

```java
// event/UserBlockedEvent.java
package cz.samofujera.auth.event;
import java.util.UUID;
public record UserBlockedEvent(UUID userId, String email) {}

// event/UserUnblockedEvent.java
package cz.samofujera.auth.event;
import java.util.UUID;
public record UserUnblockedEvent(UUID userId, String email) {}

// event/UserDeletedEvent.java
package cz.samofujera.auth.event;
import java.util.UUID;
public record UserDeletedEvent(UUID userId, String originalEmail, String name) {}
```

**Step 2: Add session management endpoints to UserController**

```java
@GetMapping("/sessions")
public ResponseEntity<ApiResponse<List<SessionResponse>>> getSessions(
        @AuthenticationPrincipal UserPrincipal principal) {
    return ResponseEntity.ok(ApiResponse.ok(authService.getSessions(principal.getId())));
}

@DeleteMapping("/sessions/{sessionId}")
public ResponseEntity<Void> revokeSession(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable String sessionId) {
    authService.revokeSession(principal.getId(), sessionId);
    return ResponseEntity.noContent().build();
}
```

**Step 3: Add GDPR deletion to UserController**

```java
@DeleteMapping
public ResponseEntity<Void> deleteAccount(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestBody DeleteAccountRequest request,
        HttpServletRequest httpRequest) {
    authService.deleteAccount(principal.getId(), request.password(), httpRequest);
    return ResponseEntity.noContent().build();
}
```

**Step 4: Create AdminController**

```java
package cz.samofujera.auth;

import cz.samofujera.shared.api.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AuthService authService;

    AdminController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<ApiResponse<String>> blockUser(@PathVariable UUID id) {
        authService.blockUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "User blocked"));
    }

    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<ApiResponse<String>> unblockUser(@PathVariable UUID id) {
        authService.unblockUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "User unblocked"));
    }
}
```

**Step 5: Implement blocking, GDPR, session listing in AuthService**

Add methods for: `getSessions()`, `revokeSession()`, `blockUser()`, `unblockUser()`, `deleteAccount()`.

The `deleteAccount` method:
1. Verify password matches
2. Capture original email before anonymization
3. Anonymize user fields
4. Set `deleted_at`
5. Delete all sessions
6. Publish `UserDeletedEvent` with original email

The `blockUser` method:
1. Set `blocked_at`
2. Delete all sessions
3. Publish `UserBlockedEvent`

**Step 6: Write tests for session management, blocking, GDPR**

Integration tests covering:
- List sessions returns current device
- Revoke session removes it
- Block user prevents login
- Unblock user allows login again
- Delete account anonymizes data and logs out

**Step 7: Run all tests, commit**

```bash
git add backend/src/
git commit -m "feat(backend): add session management, account blocking and gdpr deletion"
```

---

### Task 9: Email Module

**Files:**
- Create: `backend/src/main/java/cz/samofujera/email/internal/EmailService.java`
- Create: `backend/src/main/java/cz/samofujera/email/internal/EmailListener.java`
- Create: `backend/src/main/java/cz/samofujera/email/internal/package-info.java`
- Create: `backend/src/main/resources/templates/email/welcome.html`
- Create: `backend/src/main/resources/templates/email/password-reset.html`
- Create: `backend/src/main/resources/templates/email/account-blocked.html`
- Create: `backend/src/main/resources/templates/email/account-unblocked.html`
- Create: `backend/src/main/resources/templates/email/account-deleted.html`
- Create: `backend/src/test/java/cz/samofujera/email/EmailListenerIntegrationTest.java`

**Step 1: Create EmailService**

```java
package cz.samofujera.email.internal;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Service
class EmailService {

    private final JavaMailSender mailSender;

    EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    void send(String to, String subject, String templateName, Map<String, String> vars) {
        var html = loadTemplate(templateName);
        for (var entry : vars.entrySet()) {
            html = html.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }

        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom("noreply@samofujera.cz");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }

    private String loadTemplate(String name) {
        try (InputStream is = getClass().getResourceAsStream("/templates/email/" + name + ".html")) {
            if (is == null) throw new RuntimeException("Email template not found: " + name);
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load email template: " + name, e);
        }
    }
}
```

**Step 2: Create EmailListener**

```java
package cz.samofujera.email.internal;

import cz.samofujera.auth.event.*;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
class EmailListener {

    private final EmailService emailService;

    EmailListener(EmailService emailService) {
        this.emailService = emailService;
    }

    @ApplicationModuleListener
    void on(UserRegisteredEvent event) {
        emailService.send(event.email(), "Vítejte na Samo Fujera", "welcome",
            Map.of("name", event.name()));
    }

    @ApplicationModuleListener
    void on(PasswordResetRequestedEvent event) {
        emailService.send(event.email(), "Obnovení hesla", "password-reset",
            Map.of("token", event.token(),
                   "resetLink", "https://samofujera.cz/reset-hesla?token=" + event.token()));
    }

    @ApplicationModuleListener
    void on(UserBlockedEvent event) {
        emailService.send(event.email(), "Váš účet byl zablokován", "account-blocked", Map.of());
    }

    @ApplicationModuleListener
    void on(UserUnblockedEvent event) {
        emailService.send(event.email(), "Váš účet byl obnoven", "account-unblocked", Map.of());
    }

    @ApplicationModuleListener
    void on(UserDeletedEvent event) {
        emailService.send(event.originalEmail(), "Váš účet byl smazán", "account-deleted",
            Map.of("name", event.name()));
    }
}
```

**Step 3: Create HTML templates**

Simple HTML templates with `{{placeholder}}` variables. Each contains minimal branding (inline CSS, logo placeholder, heading, body text, footer). Example for welcome:

```html
<!DOCTYPE html>
<html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h1>Vítejte, {{name}}!</h1>
  <p>Děkujeme za registraci na platformě Samo Fujera.</p>
  <p>Vaše cesta k osobnímu rozvoji právě začala.</p>
  <hr>
  <p style="color: #666; font-size: 12px;">Samo Fujera — Osobní rozvoj, zdraví a duchovní růst</p>
</body></html>
```

Create similar templates for password-reset (with `{{resetLink}}`), account-blocked, account-unblocked, and account-deleted.

**Step 4: Write integration test**

Test that publishing events results in emails being sent (check Mailpit via its API or mock the `JavaMailSender`).

**Step 5: Run all tests, commit**

```bash
git add backend/src/
git commit -m "feat(backend): add email module with event-driven templates"
```

---

### Task 10: Backend — Update ModularityTests + Final Backend Verification

**Files:**
- Modify: `backend/src/test/java/cz/samofujera/ModularityTests.java`

**Step 1: Run modularity test**

Run: `cd backend && ./mvnw test -Dtest=ModularityTests`

The new modules (auth, user, email) need to pass verification. Fix any cross-module violations:
- `user` module importing from `auth.internal` → use public API or events
- `email` module importing events from `auth.event` → should be allowed (events are public)
- `auth.internal.UserPrincipal` used by `user` module → may need to move to auth's public API

**Step 2: Run full backend test suite**

Run: `cd backend && ./mvnw clean verify`
Expected: All tests pass, including unit, integration, and architecture tests.

**Step 3: Commit if changes were needed**

```bash
git add backend/src/
git commit -m "refactor(backend): fix module boundaries for spring modulith verification"
```

---

## PART B: FRONTEND FOUNDATION

---

### Task 11: Shared Config Package

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.base.json`
- Create: `packages/config/tailwind.css` (Tailwind 4 preset with brand theme)
- Create: `packages/config/eslint.config.js`

**Step 1: Create package.json**

```json
{
  "name": "@samofujera/config",
  "private": true,
  "version": "0.0.1",
  "exports": {
    "./tailwind": "./tailwind.css",
    "./tsconfig": "./tsconfig.base.json",
    "./eslint": "./eslint.config.js"
  }
}
```

**Step 2: Create tsconfig.base.json**

Standard strict TypeScript config: `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, `target: "ES2022"`, `jsx: "react-jsx"`.

**Step 3: Create Tailwind 4 CSS preset**

Use `@theme` directive with OKLCH brand colors. Check Context7 for exact Tailwind 4 syntax.

```css
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.97 0.01 250);
  --color-brand-100: oklch(0.93 0.02 250);
  --color-brand-500: oklch(0.55 0.15 250);
  --color-brand-600: oklch(0.48 0.15 250);
  --color-brand-700: oklch(0.40 0.15 250);
  --color-brand-900: oklch(0.25 0.10 250);

  --font-sans: "Inter", sans-serif;
  --font-heading: "Inter", sans-serif;

  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
  --radius-sm: 0.25rem;
}
```

**Step 4: Create ESLint config**

Flat config format with TypeScript, React 19 rules.

**Step 5: Install and verify**

```bash
cd packages/config && pnpm install
```

**Step 6: Commit**

```bash
git add packages/config/
git commit -m "feat(config): add shared typescript, tailwind 4 and eslint configuration"
```

---

### Task 12: UI Package (shadcn/ui)

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/input.tsx`
- Create: `packages/ui/src/components/card.tsx`
- Create: `packages/ui/src/components/dialog.tsx`
- Create: `packages/ui/src/components/form.tsx`
- Create: `packages/ui/src/components/alert.tsx`
- Create: `packages/ui/src/index.ts` (barrel export)
- Create: `packages/ui/tailwind.css`

Set up shadcn/ui with the brand theme from `@samofujera/config`. Use `pnpm dlx shadcn@latest init` and then add components. Check Context7 for shadcn/ui latest setup.

**Step 1: Initialize shadcn/ui in packages/ui**
**Step 2: Add components: Button, Input, Card, Dialog, Form, Alert**
**Step 3: Create barrel export**
**Step 4: Verify build**

```bash
pnpm build --filter=@samofujera/ui
```

**Step 5: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): add shadcn/ui components with brand theme"
```

---

### Task 13: API Client Package

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/types.ts`
- Create: `packages/api-client/src/auth.ts`
- Create: `packages/api-client/src/user.ts`
- Create: `packages/api-client/src/index.ts`
- Create: `packages/api-client/tsconfig.json`

**Step 1: Create typed fetch wrapper**

```typescript
// src/client.ts
const BASE_URL = import.meta.env?.PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
```

**Step 2: Create auth and user API functions**

```typescript
// src/auth.ts
import { apiFetch } from "./client";
import type { ApiResponse, UserResponse, LoginRequest, RegisterRequest } from "./types";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiFetch<ApiResponse<UserResponse>>("/api/auth/register", {
      method: "POST", body: JSON.stringify(data),
    }),
  login: (data: LoginRequest) =>
    apiFetch<ApiResponse<UserResponse>>("/api/auth/login", {
      method: "POST", body: JSON.stringify(data),
    }),
  logout: () =>
    apiFetch<void>("/api/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) =>
    apiFetch<ApiResponse<string>>("/api/auth/forgot-password", {
      method: "POST", body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    apiFetch<ApiResponse<string>>("/api/auth/reset-password", {
      method: "POST", body: JSON.stringify({ token, newPassword }),
    }),
};
```

**Step 3: Commit**

```bash
git add packages/api-client/
git commit -m "feat(api-client): add typed fetch wrapper with auth and user endpoints"
```

---

### Task 14: i18n Package (Lingui)

**Files:**
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/lingui.config.ts`
- Create: `packages/i18n/src/locales/cs/messages.po`
- Create: `packages/i18n/src/locales/sk/messages.po`
- Create: `packages/i18n/src/i18n.ts`
- Create: `packages/i18n/src/index.ts`

Set up Lingui with Czech as primary locale, Slovak as secondary (empty). Check Context7 for Lingui latest setup with React 19.

All auth-related strings: form labels, validation errors, success messages, page titles.

**Step 1: Install Lingui**

```bash
cd packages/i18n && pnpm add @lingui/core @lingui/react && pnpm add -D @lingui/cli @lingui/vite-plugin
```

**Step 2: Create config, catalogs, setup**
**Step 3: Add Czech translations for auth strings**
**Step 4: Commit**

```bash
git add packages/i18n/
git commit -m "feat(i18n): add lingui setup with czech auth translations"
```

---

### Task 15: Astro Web App

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/astro.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/layouts/BaseLayout.astro`
- Create: `apps/web/src/pages/index.astro`
- Create: `apps/web/src/pages/prihlaseni.astro`
- Create: `apps/web/src/pages/registrace.astro`
- Create: `apps/web/src/pages/zapomenute-heslo.astro`
- Create: `apps/web/src/pages/reset-hesla.astro`
- Create: `apps/web/src/components/LoginForm.tsx` (React island)
- Create: `apps/web/src/components/RegisterForm.tsx` (React island)
- Create: `apps/web/src/components/ForgotPasswordForm.tsx` (React island)
- Create: `apps/web/src/components/ResetPasswordForm.tsx` (React island)

**Step 1: Initialize Astro project**

```bash
cd apps/web && pnpm create astro@latest . --template minimal --no-install
pnpm add astro @astrojs/react @astrojs/tailwind react react-dom
pnpm add @samofujera/ui @samofujera/api-client @samofujera/i18n @samofujera/config --workspace
```

**Step 2: Configure astro.config.mjs**

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  output: "static",
  integrations: [react()],
});
```

**Step 3: Create BaseLayout with header, footer, brand styling**
**Step 4: Create homepage (/) with hero section**
**Step 5: Create auth pages using React islands**

Each auth page is an Astro page that renders a React component with `client:load`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import LoginForm from "../components/LoginForm";
---
<BaseLayout title="Přihlášení">
  <LoginForm client:load />
</BaseLayout>
```

React form components use `@samofujera/api-client` for API calls and `@samofujera/ui` for styled components.

**Step 6: Verify dev server**

```bash
cd apps/web && pnpm dev
```

**Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add astro site with auth pages and react form islands"
```

---

### Task 16: Admin SPA Shell

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/vite.config.ts`
- Create: `apps/admin/tsconfig.json`
- Create: `apps/admin/index.html`
- Create: `apps/admin/src/main.tsx`
- Create: `apps/admin/src/router.tsx`
- Create: `apps/admin/src/routes/dashboard.tsx`
- Create: `apps/admin/src/routes/users.tsx`
- Create: `apps/admin/src/components/AuthGuard.tsx`
- Create: `apps/admin/src/components/AdminLayout.tsx`

**Step 1: Initialize React SPA with Vite**

```bash
cd apps/admin && pnpm create vite . --template react-ts --no-install
pnpm add react react-dom @tanstack/react-router @tanstack/react-query
pnpm add @samofujera/ui @samofujera/api-client @samofujera/i18n @samofujera/config --workspace
```

**Step 2: Set up TanStack Router with routes**

Check Context7 for TanStack Router latest file-based routing setup.

Routes:
- `/admin/` → Dashboard placeholder
- `/admin/users` → Users list placeholder

**Step 3: Create AuthGuard component**

Checks session by calling `GET /api/me`. If 401, redirects to `/prihlaseni`.

**Step 4: Create AdminLayout with sidebar navigation**
**Step 5: Verify dev server**
**Step 6: Commit**

```bash
git add apps/admin/
git commit -m "feat(admin): add react spa shell with tanstack router"
```

---

### Task 17: Customer Dashboard SPA Shell

**Files:**
- Create: `apps/customer/package.json`
- Create: `apps/customer/vite.config.ts`
- Create: `apps/customer/tsconfig.json`
- Create: `apps/customer/index.html`
- Create: `apps/customer/src/main.tsx`
- Create: `apps/customer/src/router.tsx`
- Create: `apps/customer/src/routes/dashboard.tsx`
- Create: `apps/customer/src/routes/sessions.tsx`
- Create: `apps/customer/src/routes/profile.tsx`
- Create: `apps/customer/src/routes/delete-account.tsx`
- Create: `apps/customer/src/components/AuthGuard.tsx`
- Create: `apps/customer/src/components/DashboardLayout.tsx`

Similar structure to admin SPA. Routes:
- `/dashboard/` → Overview placeholder
- `/dashboard/sessions` → Active sessions (calls `GET /api/me/sessions`)
- `/dashboard/profile` → Edit profile (calls `GET /api/me`, `PUT /api/me`)
- `/dashboard/delete-account` → GDPR deletion (calls `DELETE /api/me`)

The sessions page is the most functional — it lists active devices and allows revoking sessions.

**Step 1-6:** Same pattern as admin SPA.

**Step 7: Commit**

```bash
git add apps/customer/
git commit -m "feat(customer): add dashboard spa with session management and profile"
```

---

### Task 18: Email Templates Package

**Files:**
- Create: `packages/emails/package.json`
- Create: `packages/emails/src/Welcome.tsx`
- Create: `packages/emails/src/PasswordReset.tsx`
- Create: `packages/emails/src/AccountBlocked.tsx`
- Create: `packages/emails/src/AccountUnblocked.tsx`
- Create: `packages/emails/src/AccountDeleted.tsx`
- Create: `packages/emails/src/components/Layout.tsx`
- Create: `packages/emails/build.ts` (compile to HTML)
- Create: `packages/emails/tsconfig.json`

**Step 1: Install React Email**

```bash
cd packages/emails && pnpm add react-email @react-email/components react react-dom
pnpm add -D tsx typescript
```

**Step 2: Create shared Layout component**

Brand header, content area, footer with consistent styling.

**Step 3: Create email templates using React Email components**

Each template uses `{{placeholder}}` syntax in the rendered output for the Java backend to replace.

**Step 4: Create build script**

```typescript
// build.ts
import { render } from "@react-email/render";
import { writeFileSync, mkdirSync } from "fs";
// Import and render each template to static HTML
// Output to: ../../backend/src/main/resources/templates/email/
```

**Step 5: Add build script to package.json**

```json
"scripts": {
  "build": "tsx build.ts"
}
```

**Step 6: Run build and verify output**

```bash
cd packages/emails && pnpm build
```

Check that `backend/src/main/resources/templates/email/*.html` files are generated.

**Step 7: Commit**

```bash
git add packages/emails/ backend/src/main/resources/templates/email/
git commit -m "feat(emails): add react email templates with build pipeline"
```

---

## PART C: CI/CD & E2E

---

### Task 19: GitHub Actions — Backend

**Files:**
- Create: `.github/workflows/backend.yml`

```yaml
name: backend

on:
  push:
    branches: [main, develop]
    paths: ['backend/**']
  pull_request:
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 25
      - name: cache maven
        uses: actions/cache@v4
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('backend/pom.xml') }}
      - name: test
        working-directory: backend
        run: ./mvnw verify

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 25
      - name: build jar
        working-directory: backend
        run: ./mvnw package -DskipTests
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: deploy
        working-directory: backend
        run: flyctl deploy --local-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Step 1: Create workflow file**
**Step 2: Commit**

```bash
git add .github/
git commit -m "ci(backend): add github actions workflow for test and deploy"
```

---

### Task 20: GitHub Actions — Frontend + Commitlint

**Files:**
- Create: `.github/workflows/frontend.yml`
- Create: `.github/workflows/commitlint.yml`

**frontend.yml:**

```yaml
name: frontend

on:
  push:
    branches: [main, develop]
    paths: ['apps/**', 'packages/**']
  pull_request:
    paths: ['apps/**', 'packages/**']

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint
      - run: pnpm turbo typecheck
      - run: pnpm turbo test
      - run: pnpm turbo build

  deploy:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - name: deploy web
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy apps/web/dist --project-name=samofujera
```

**commitlint.yml:**

```yaml
name: commitlint

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v6
        with:
          configFile: commitlint.config.js
```

**Step 1: Create workflow files**
**Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add frontend and commitlint github actions workflows"
```

---

### Task 21: Playwright E2E Tests

**Files:**
- Create: `e2e/playwright.config.ts`
- Create: `e2e/package.json`
- Create: `e2e/tests/auth-flow.spec.ts`
- Modify: `pnpm-workspace.yaml` (add `e2e`)

**Step 1: Set up Playwright**

```bash
mkdir e2e && cd e2e
pnpm create playwright . --no-install
pnpm add -D @playwright/test
```

**Step 2: Write auth flow e2e test**

```typescript
// e2e/tests/auth-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("auth flow", () => {
  test("register, login, view profile, logout", async ({ page }) => {
    // Register
    await page.goto("/registrace");
    await page.fill('[name="email"]', "e2e@test.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="name"]', "E2E User");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/prihlaseni/);

    // Login
    await page.fill('[name="email"]', "e2e@test.com");
    await page.fill('[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);

    // View profile
    await page.goto("/dashboard/profile");
    await expect(page.locator("text=E2E User")).toBeVisible();

    // Logout
    await page.click("text=Odhlásit");
    await expect(page).toHaveURL(/prihlaseni/);
  });
});
```

**Step 3: Commit**

```bash
git add e2e/ pnpm-workspace.yaml
git commit -m "test: add playwright e2e auth flow test"
```

---

### Task 22: Final Verification

**Step 1: Run full backend test suite**

```bash
cd backend && ./mvnw clean verify
```

Expected: All tests pass (unit + integration + architecture).

**Step 2: Build all frontend packages**

```bash
pnpm turbo build
```

Expected: All packages build successfully.

**Step 3: Start Docker Compose + backend + frontend dev servers**

```bash
docker compose up -d
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev &
pnpm dev --filter=@samofujera/web
```

**Step 4: Verify health endpoint**

```bash
curl http://localhost:8080/actuator/health
```

Expected: `{"status":"UP"}`

**Step 5: Manual smoke test**

- Open `http://localhost:4321/registrace` → register form works
- Register a user → check Mailpit for welcome email
- Login → redirected to dashboard
- View profile, sessions
- Logout

**Step 6: Clean up and final commit if needed**

```bash
docker compose down
git status
# Commit any remaining changes
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Add backend dependencies | Compilation |
| 2 | Flyway migrations V3-V4 + JOOQ regen | Generated classes |
| 3 | Spring Security configuration | Compilation |
| 4 | Auth registration | 2 unit + 2 integration |
| 5 | Login + device tracking | 2+ integration |
| 6 | Logout + password reset | 3+ integration |
| 7 | User profile CRUD | 3 integration |
| 8 | Sessions + blocking + GDPR | 5+ integration |
| 9 | Email module | 2+ integration |
| 10 | Modularity verification | Architecture |
| 11 | Shared config package | Build |
| 12 | UI package (shadcn/ui) | Build |
| 13 | API client package | Build |
| 14 | i18n package (Lingui) | Build |
| 15 | Astro web app | Dev server |
| 16 | Admin SPA shell | Dev server |
| 17 | Customer dashboard SPA | Dev server |
| 18 | Email templates package | Build |
| 19 | GitHub Actions — backend | — |
| 20 | GitHub Actions — frontend + commitlint | — |
| 21 | Playwright e2e tests | E2E |
| 22 | Final verification | Full suite |

**Total tasks:** 22
**Estimated backend tests:** 20+ (unit + integration + architecture)
**Estimated frontend tests:** Vitest unit + Playwright e2e
**Estimated commits:** ~22
