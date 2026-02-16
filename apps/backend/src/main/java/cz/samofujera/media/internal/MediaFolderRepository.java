package cz.samofujera.media.internal;

import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static cz.samofujera.generated.jooq.Tables.MEDIA_FOLDERS;
import static cz.samofujera.generated.jooq.Tables.MEDIA_ITEMS;

@Repository
public class MediaFolderRepository {

    private final DSLContext dsl;

    MediaFolderRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public record FolderRow(UUID id, String name, String slug, UUID parentFolderId, OffsetDateTime createdAt) {}

    public List<FolderRow> findAll() {
        return dsl.selectFrom(MEDIA_FOLDERS)
            .orderBy(MEDIA_FOLDERS.NAME.asc())
            .fetch(r -> new FolderRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getParentFolderId(),
                r.getCreatedAt()
            ));
    }

    public Optional<FolderRow> findById(UUID id) {
        return dsl.selectFrom(MEDIA_FOLDERS)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .fetchOptional(r -> new FolderRow(
                r.getId(),
                r.getName(),
                r.getSlug(),
                r.getParentFolderId(),
                r.getCreatedAt()
            ));
    }

    public UUID create(String name, String slug, UUID parentFolderId) {
        return dsl.insertInto(MEDIA_FOLDERS)
            .set(MEDIA_FOLDERS.NAME, name)
            .set(MEDIA_FOLDERS.SLUG, slug)
            .set(MEDIA_FOLDERS.PARENT_FOLDER_ID, parentFolderId)
            .returning(MEDIA_FOLDERS.ID)
            .fetchOne()
            .getId();
    }

    public void rename(UUID id, String name, String slug) {
        dsl.update(MEDIA_FOLDERS)
            .set(MEDIA_FOLDERS.NAME, name)
            .set(MEDIA_FOLDERS.SLUG, slug)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .execute();
    }

    public void delete(UUID id) {
        dsl.deleteFrom(MEDIA_FOLDERS)
            .where(MEDIA_FOLDERS.ID.eq(id))
            .execute();
    }

    public boolean hasChildren(UUID id) {
        return dsl.fetchExists(
            dsl.selectFrom(MEDIA_FOLDERS)
                .where(MEDIA_FOLDERS.PARENT_FOLDER_ID.eq(id))
        );
    }

    public boolean hasItems(UUID id) {
        return dsl.fetchExists(
            dsl.selectFrom(MEDIA_ITEMS)
                .where(MEDIA_ITEMS.FOLDER_ID.eq(id))
        );
    }
}
