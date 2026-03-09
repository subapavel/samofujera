package cz.samofujera.auth;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

@QuarkusTest
public class AuthResourceTest {

    @Test
    public void testRegisterAndLogin() {
        // Register a new user
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "test@example.com", "password": "password123", "displayName": "Test User"}
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201)
                .body("data.email", equalTo("test@example.com"))
                .body("data.name", equalTo("Test User"))
                .body("data.roles", notNullValue());

        // Login with the registered user
        String sessionCookie = given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "test@example.com", "password": "password123"}
                        """)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(200)
                .cookie("SESSION_ID", notNullValue())
                .body("data.email", equalTo("test@example.com"))
                .extract()
                .cookie("SESSION_ID");

        // Access /api/me with session cookie
        given()
                .cookie("SESSION_ID", sessionCookie)
                .when()
                .get("/api/me")
                .then()
                .statusCode(200)
                .body("data.email", equalTo("test@example.com"));

        // Logout
        given()
                .cookie("SESSION_ID", sessionCookie)
                .when()
                .post("/api/auth/logout")
                .then()
                .statusCode(200);

        // /api/me should now fail
        given()
                .cookie("SESSION_ID", sessionCookie)
                .when()
                .get("/api/me")
                .then()
                .statusCode(401);
    }

    @Test
    public void testLoginWithWrongPassword() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "wrong@example.com", "password": "password123", "displayName": "Wrong"}
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "wrong@example.com", "password": "wrongpassword"}
                        """)
                .when()
                .post("/api/auth/login")
                .then()
                .statusCode(401);
    }

    @Test
    public void testProtectedEndpointWithoutSession() {
        given()
                .when()
                .get("/api/me")
                .then()
                .statusCode(401);
    }

    @Test
    public void testDuplicateRegistration() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "dupe@example.com", "password": "password123", "displayName": "First"}
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(201);

        given()
                .contentType(ContentType.JSON)
                .body("""
                        {"email": "dupe@example.com", "password": "password456", "displayName": "Second"}
                        """)
                .when()
                .post("/api/auth/register")
                .then()
                .statusCode(409);
    }
}
