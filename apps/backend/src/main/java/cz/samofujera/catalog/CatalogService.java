package cz.samofujera.catalog;

import cz.samofujera.catalog.internal.CategoryRepository;
import cz.samofujera.catalog.internal.DigitalAssetRepository;
import cz.samofujera.catalog.internal.ProductRepository;
import cz.samofujera.catalog.internal.R2StorageService;
import cz.samofujera.shared.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final DigitalAssetRepository digitalAssetRepository;
    private final R2StorageService r2StorageService;

    CatalogService(CategoryRepository categoryRepository, ProductRepository productRepository,
                   DigitalAssetRepository digitalAssetRepository, R2StorageService r2StorageService) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.digitalAssetRepository = digitalAssetRepository;
        this.r2StorageService = r2StorageService;
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

    // Product methods

    public CatalogDtos.ProductResponse getProductById(UUID id) {
        var product = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));
        return toProductResponse(product);
    }

    public CatalogDtos.ProductListResponse getProducts(String status, UUID categoryId,
            String productType, String search, int page, int limit) {
        int offset = (page - 1) * limit;
        var items = productRepository.findAll(status, categoryId, productType, search, offset, limit);
        long totalItems = productRepository.count(status, categoryId, productType, search);
        int totalPages = (int) Math.ceil((double) totalItems / limit);

        var responses = items.stream().map(this::toProductResponse).toList();
        return new CatalogDtos.ProductListResponse(responses, page, limit, totalItems, totalPages);
    }

    public CatalogDtos.ProductDetailResponse getProductBySlug(String slug) {
        var product = productRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var assets = getAssetsForProduct(product.id());

        return new CatalogDtos.ProductDetailResponse(
            product.id(), product.title(), product.slug(), product.description(),
            product.shortDescription(), product.productType(), product.priceAmount(),
            product.priceCurrency(), product.status(), product.thumbnailUrl(),
            product.categoryId(), product.categoryName(),
            assets,
            product.createdAt(), product.updatedAt()
        );
    }

    @Transactional
    public CatalogDtos.ProductResponse createProduct(CatalogDtos.CreateProductRequest request) {
        if (productRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Product with slug '" + request.slug() + "' already exists");
        }

        var id = productRepository.create(
            request.title(), request.slug(), request.description(), request.shortDescription(),
            request.productType(), request.priceAmount(), request.priceCurrency(),
            request.thumbnailUrl(), request.categoryId()
        );

        var created = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        return toProductResponse(created);
    }

    @Transactional
    public CatalogDtos.ProductResponse updateProduct(UUID id, CatalogDtos.UpdateProductRequest request) {
        productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        productRepository.update(
            id, request.title(), request.slug(), request.description(), request.shortDescription(),
            request.productType(), request.priceAmount(), request.priceCurrency(),
            request.status(), request.thumbnailUrl(), request.categoryId()
        );

        var updated = productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        return toProductResponse(updated);
    }

    @Transactional
    public void archiveProduct(UUID id) {
        productRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        productRepository.updateStatus(id, "ARCHIVED");
    }

    // Public asset access methods (used by delivery module)

    public CatalogDtos.AssetDetailResponse getAssetById(UUID assetId) {
        var asset = digitalAssetRepository.findById(assetId)
            .orElseThrow(() -> new NotFoundException("Asset not found"));
        return new CatalogDtos.AssetDetailResponse(
            asset.id(), asset.productId(), asset.assetType(), asset.fileKey(),
            asset.fileName(), asset.fileSizeBytes(), asset.mimeType(),
            asset.durationSeconds(), asset.sortOrder()
        );
    }

    public String generateAssetDownloadUrl(UUID assetId, Duration ttl) {
        var asset = digitalAssetRepository.findById(assetId)
            .orElseThrow(() -> new NotFoundException("Asset not found"));
        return r2StorageService.generatePresignedUrl(asset.fileKey(), ttl);
    }

    // Asset methods

    @Transactional
    public CatalogDtos.AssetResponse uploadAsset(UUID productId, String fileName, String mimeType,
                                                  long fileSize, InputStream inputStream) {
        productRepository.findById(productId)
            .orElseThrow(() -> new NotFoundException("Product not found"));

        var assetType = resolveAssetType(mimeType);
        var fileKey = "products/" + productId + "/" + UUID.randomUUID() + "/" + fileName;
        var sortOrder = digitalAssetRepository.countByProductId(productId);

        r2StorageService.upload(fileKey, inputStream, fileSize, mimeType);

        var assetId = digitalAssetRepository.create(
            productId, assetType, fileKey, fileName, fileSize, mimeType, sortOrder);

        var asset = digitalAssetRepository.findById(assetId)
            .orElseThrow(() -> new NotFoundException("Asset not found"));

        return toAssetResponse(asset);
    }

    @Transactional
    public void deleteAsset(UUID productId, UUID assetId) {
        var asset = digitalAssetRepository.findById(assetId)
            .orElseThrow(() -> new NotFoundException("Asset not found"));

        if (!asset.productId().equals(productId)) {
            throw new IllegalArgumentException("Asset does not belong to product");
        }

        r2StorageService.delete(asset.fileKey());
        digitalAssetRepository.delete(assetId);
    }

    public List<CatalogDtos.AssetResponse> getAssetsForProduct(UUID productId) {
        return digitalAssetRepository.findByProductId(productId).stream()
            .map(this::toAssetResponse)
            .toList();
    }

    private String resolveAssetType(String mimeType) {
        if (mimeType == null) {
            return "OTHER";
        }
        if (mimeType.equals("application/pdf")) {
            return "PDF";
        }
        if (mimeType.startsWith("audio/")) {
            return "MP3";
        }
        if (mimeType.startsWith("video/")) {
            return "VIDEO";
        }
        if (mimeType.equals("application/zip") || mimeType.equals("application/x-zip-compressed")) {
            return "ZIP";
        }
        return "OTHER";
    }

    private CatalogDtos.AssetResponse toAssetResponse(DigitalAssetRepository.AssetRow row) {
        return new CatalogDtos.AssetResponse(
            row.id(), row.assetType(), row.fileName(), row.fileSizeBytes(),
            row.mimeType(), row.durationSeconds(), row.sortOrder()
        );
    }

    private CatalogDtos.ProductResponse toProductResponse(ProductRepository.ProductRow row) {
        return new CatalogDtos.ProductResponse(
            row.id(), row.title(), row.slug(), row.description(), row.shortDescription(),
            row.productType(), row.priceAmount(), row.priceCurrency(), row.status(),
            row.thumbnailUrl(), row.categoryId(), row.categoryName(),
            row.createdAt(), row.updatedAt()
        );
    }
}
