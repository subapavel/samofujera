---
name: api-endpoint
description: "Create a full vertical slice API endpoint: Controller, Service method, Repository query, DTO, unit test, and integration test."
argument-hint: "[HTTP-method] [path] [description]"
disable-model-invocation: true
---

# Create Full Vertical Slice API Endpoint

## MANDATORY: Check Context7 First
Use Context7 to verify Spring Boot 4 controller annotations, Spring Security
configuration, and response handling patterns.

## Steps (TDD)

1. **Write the integration test first** (red)
   - Test the HTTP endpoint end-to-end
   - Use `@ApplicationModuleTest` + `MockMvc` or `WebTestClient`
   - Assert on response status, body structure, and side effects

2. **Run the test** — verify it fails (red)

3. **Create the DTO** (Java record in module root)
   - Request record (if POST/PUT)
   - Response record

4. **Create/update the Repository** (in `internal/`)
   - JOOQ query for the data access needed

5. **Create/update the Service** (public API)
   - Business logic, validation, event publishing

6. **Create the Controller**
   - Maps to the service method
   - Uses `ApiResponse<T>` wrapper for consistency

7. **Run the test** — verify it passes (green)

8. **Refactor** if needed

9. **Commit**

## Controller Template
```java
@RestController
@RequestMapping("/api")
class ${Name}Controller {

    private final ${Module}Service service;

    ${Name}Controller(${Module}Service service) {
        this.service = service;
    }

    @GetMapping("${path}")
    ApiResponse<${Response}Record> handle() {
        var result = service.method();
        return ApiResponse.ok(result);
    }
}
```

## Response Wrapper
All endpoints return `ApiResponse<T>`:
```java
public record ApiResponse<T>(T data, String message) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }
}
```

For paginated results, use `PagedResponse<T>`.

## Security
- Public endpoints: no annotation needed (configured in `SecurityConfig`)
- Authenticated endpoints: `@PreAuthorize("isAuthenticated()")`
- Admin endpoints: `@PreAuthorize("hasRole('ADMIN')")`

## Rules
- Always TDD — test first, then implement
- Always use `ApiResponse` wrapper
- Always validate input (Bean Validation annotations on request records)
- Always handle errors via `GlobalExceptionHandler`
- i18n for any user-facing error messages
