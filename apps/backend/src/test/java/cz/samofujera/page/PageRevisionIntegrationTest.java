package cz.samofujera.page;

import cz.samofujera.TestcontainersConfig;
import cz.samofujera.auth.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Set;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class PageRevisionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private UUID realUserId;

    @BeforeEach
    void setUp() throws Exception {
        if (realUserId == null) {
            var email = "rev-test-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com";
            var result = mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"email": "%s", "password": "password123", "name": "Rev Test User"}
                        """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();
            realUserId = UUID.fromString(com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.data.id").toString());
        }
    }

    private UserPrincipal adminPrincipal() {
        return new UserPrincipal(realUserId, "admin@test.com", "Admin", "hashed", Set.of("ADMIN"), false, false);
    }

    private String createPage(String slug, String title) throws Exception {
        var result = mockMvc.perform(post("/api/admin/pages")
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "%s"}
                    """.formatted(slug, title)))
            .andExpect(status().isCreated())
            .andReturn();
        return com.jayway.jsonpath.JsonPath.read(
            result.getResponse().getContentAsString(), "$.data.id").toString();
    }

    @Test
    void publishPage_createsRevision() throws Exception {
        var pageId = createPage("rev-test-" + UUID.randomUUID().toString().substring(0, 8), "Revision Test");

        // Update with content
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "rev-test", "title": "Revision Test", "content": {"blocks": [{"type": "text"}]},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """))
            .andExpect(status().isOk());

        // Publish
        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Check revisions
        mockMvc.perform(get("/api/admin/pages/" + pageId + "/revisions")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data.length()").value(1))
            .andExpect(jsonPath("$.data[0].version").value(1))
            .andExpect(jsonPath("$.data[0].title").value("Revision Test"));
    }

    @Test
    void publishPage_twice_createsVersions() throws Exception {
        var slug = "rev-v2-" + UUID.randomUUID().toString().substring(0, 8);
        var pageId = createPage(slug, "Version Test");

        // Update and publish v1
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "Version 1", "content": {"v": 1},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Update and publish v2
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "Version 2", "content": {"v": 2},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Check two revisions
        mockMvc.perform(get("/api/admin/pages/" + pageId + "/revisions")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].version").value(2))
            .andExpect(jsonPath("$.data[1].version").value(1));
    }

    @Test
    void publicPage_readsFromRevision_notDraft() throws Exception {
        var slug = "rev-pub-" + UUID.randomUUID().toString().substring(0, 8);
        var pageId = createPage(slug, "Public Test");

        // Update and publish
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "Published Title", "content": {"published": true},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Modify draft AFTER publish
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "Draft Title", "content": {"draft": true},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        // Public endpoint should show revision content, not draft
        mockMvc.perform(get("/api/pages/" + slug))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("Published Title"))
            .andExpect(jsonPath("$.data.content.published").value(true));
    }

    @Test
    void restoreRevision_copiesContentToDraft() throws Exception {
        var slug = "rev-restore-" + UUID.randomUUID().toString().substring(0, 8);
        var pageId = createPage(slug, "Restore Test");

        // Publish v1
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "V1 Title", "content": {"version": 1},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Publish v2
        mockMvc.perform(put("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"slug": "%s", "title": "V2 Title", "content": {"version": 2},
                     "showInNav": false, "noindex": false, "nofollow": false}
                    """.formatted(slug)))
            .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/pages/" + pageId + "/publish")
                .with(user(adminPrincipal())))
            .andExpect(status().isNoContent());

        // Get revision list and find v1
        var revisionsResult = mockMvc.perform(get("/api/admin/pages/" + pageId + "/revisions")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andReturn();

        var v1RevisionId = com.jayway.jsonpath.JsonPath.read(
            revisionsResult.getResponse().getContentAsString(), "$.data[1].id").toString();

        // Restore v1
        var restoreResult = mockMvc.perform(post("/api/admin/pages/" + pageId + "/revisions/" + v1RevisionId + "/restore")
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("V1 Title"))
            .andReturn();

        // Draft should now have v1 content
        mockMvc.perform(get("/api/admin/pages/" + pageId)
                .with(user(adminPrincipal())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("V1 Title"));

        // Public endpoint should still serve v2 (published revision unchanged)
        mockMvc.perform(get("/api/pages/" + slug))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("V2 Title"));
    }
}
