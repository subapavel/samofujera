package cz.samofujera.catalog;

import cz.samofujera.catalog.internal.CategoryRepository;
import cz.samofujera.shared.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;

    CatalogService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CatalogDtos.CategoryResponse> getCategoryTree() {
        var allCategories = categoryRepository.findAll();

        // Build a map of id -> response with empty children
        var responseMap = new LinkedHashMap<UUID, CatalogDtos.CategoryResponse>();
        var childrenMap = new LinkedHashMap<UUID, List<CatalogDtos.CategoryResponse>>();

        // First pass: create all response objects
        for (var cat : allCategories) {
            childrenMap.put(cat.id(), new ArrayList<>());
        }

        // Second pass: assign children
        for (var cat : allCategories) {
            if (cat.parentId() != null && childrenMap.containsKey(cat.parentId())) {
                childrenMap.get(cat.parentId()).add(toResponse(cat, childrenMap));
            }
        }

        // Build tree: return only root categories (no parent)
        var roots = new ArrayList<CatalogDtos.CategoryResponse>();
        for (var cat : allCategories) {
            if (cat.parentId() == null) {
                roots.add(toResponse(cat, childrenMap));
            }
        }
        return roots;
    }

    private CatalogDtos.CategoryResponse toResponse(
            CategoryRepository.CategoryRow row,
            LinkedHashMap<UUID, List<CatalogDtos.CategoryResponse>> childrenMap) {
        return new CatalogDtos.CategoryResponse(
            row.id(),
            row.name(),
            row.slug(),
            row.parentId(),
            row.sortOrder(),
            childrenMap.getOrDefault(row.id(), List.of())
        );
    }

    @Transactional
    public CatalogDtos.CategoryResponse createCategory(CatalogDtos.CreateCategoryRequest request) {
        if (categoryRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Category with slug '" + request.slug() + "' already exists");
        }

        var id = categoryRepository.create(
            request.name(),
            request.slug(),
            request.parentId(),
            request.sortOrder()
        );

        var created = categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));

        return new CatalogDtos.CategoryResponse(
            created.id(),
            created.name(),
            created.slug(),
            created.parentId(),
            created.sortOrder(),
            List.of()
        );
    }

    @Transactional
    public CatalogDtos.CategoryResponse updateCategory(UUID id, CatalogDtos.UpdateCategoryRequest request) {
        categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));

        categoryRepository.update(
            id,
            request.name(),
            request.slug(),
            request.parentId(),
            request.sortOrder()
        );

        var updated = categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));

        return new CatalogDtos.CategoryResponse(
            updated.id(),
            updated.name(),
            updated.slug(),
            updated.parentId(),
            updated.sortOrder(),
            List.of()
        );
    }

    @Transactional
    public void deleteCategory(UUID id) {
        categoryRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Category not found"));

        categoryRepository.delete(id);
    }
}
