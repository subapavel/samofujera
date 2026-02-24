"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogApi } from "@samofujera/api-client";
import type {
  ProductResponse,
  CategoryResponse,
} from "@samofujera/api-client";

interface ProductsBlockData {
  type: "products";
  mode: "category" | "manual";
  categoryId: string | null;
  productIds: string[];
  appearance: string;
  columns: number;
  showCategoryFilter: boolean;
}

const priceFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
});

function formatPrice(prices: Record<string, number>): string {
  const price = prices["CZK"] ?? 0;
  return priceFormatter.format(price);
}

function ProductCard({
  product,
  largeImage,
}: {
  product: ProductResponse;
  largeImage: boolean;
}) {
  const imageClass = largeImage
    ? "product-card-image product-card-image-large"
    : "product-card-image";

  return (
    <a href={`/produkty/${product.slug}`} className="product-card">
      {product.thumbnailUrl ? (
        <Image
          src={product.thumbnailUrl}
          alt={product.title}
          width={400}
          height={largeImage ? 500 : 300}
          sizes="(max-width: 768px) 100vw, 400px"
          className={imageClass}
        />
      ) : (
        <div className={imageClass} />
      )}
      <div className="product-card-title">{product.title}</div>
      <div className="product-card-price">{formatPrice(product.prices)}</div>
    </a>
  );
}

function DefaultGrid({
  products,
  columns,
  largeImage,
}: {
  products: ProductResponse[];
  columns: number;
  largeImage: boolean;
}) {
  return (
    <div className={`products-grid products-grid-${columns}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          largeImage={largeImage}
        />
      ))}
    </div>
  );
}

function SliderView({
  products,
  columns,
  largeImage,
}: {
  products: ProductResponse[];
  columns: number;
  largeImage: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "prev" | "next") => {
    const el = containerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="products-slider-wrapper">
      <button
        className="products-nav-arrow products-nav-prev"
        onClick={() => scroll("prev")}
        aria-label="Předchozí"
      >
        <ChevronLeft size={24} />
      </button>
      <div
        ref={containerRef}
        className={`products-slider products-slider-${columns}`}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            largeImage={largeImage}
          />
        ))}
      </div>
      <button
        className="products-nav-arrow products-nav-next"
        onClick={() => scroll("next")}
        aria-label="Další"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}

function CarouselView({
  products,
  columns,
  largeImage,
}: {
  products: ProductResponse[];
  columns: number;
  largeImage: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalPages = Math.max(1, Math.ceil(products.length / columns));

  const goToPage = useCallback(
    (index: number) => {
      setCurrentIndex(index % totalPages);
    },
    [totalPages],
  );

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalPages);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalPages]);

  const handleDotClick = (index: number) => {
    goToPage(index);
    // Reset auto-advance timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalPages);
    }, 5000);
  };

  const translateX = -(currentIndex * 100);

  return (
    <div className="products-carousel">
      <div
        className="products-carousel-track"
        style={{
          transform: `translateX(${String(translateX)}%)`,
        }}
      >
        {Array.from({ length: totalPages }).map((_, pageIdx) => {
          const pageProducts = products.slice(
            pageIdx * columns,
            (pageIdx + 1) * columns,
          );
          return (
            <div
              key={pageIdx}
              className={`products-grid products-grid-${columns}`}
              style={{ minWidth: "100%", flexShrink: 0 }}
            >
              {pageProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  largeImage={largeImage}
                />
              ))}
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="products-carousel-dots">
          {Array.from({ length: totalPages }).map((_, idx) => (
            <button
              key={idx}
              className={`products-carousel-dot${idx === currentIndex ? " products-carousel-dot-active" : ""}`}
              onClick={() => handleDotClick(idx)}
              aria-label={`Stránka ${String(idx + 1)}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductsBlockRenderer({
  block,
}: {
  block: ProductsBlockData;
}) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch categories for sidebar and slug resolution
        const catRes = await catalogApi.getCategories();
        const cats = catRes.data ?? [];
        if (cancelled) return;
        setCategories(cats);

        // Fetch products based on mode
        let productRes;
        if (block.mode === "manual" && block.productIds.length > 0) {
          productRes = await catalogApi.getProducts({
            ids: block.productIds,
          });
        } else if (block.mode === "category" && block.categoryId) {
          // Resolve categoryId to slug
          const cat = cats.find((c) => c.id === block.categoryId);
          const categorySlug = cat?.slug;
          productRes = await catalogApi.getProducts({
            category: categorySlug,
          });
        } else {
          productRes = await catalogApi.getProducts();
        }

        if (cancelled) return;
        setProducts(productRes.data?.items ?? []);
      } catch {
        // Silently fail — block will show empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [block.mode, block.categoryId, block.productIds]);

  if (loading) {
    return (
      <div className="products-layout">
        <div className="products-loading">Načítání produktů...</div>
      </div>
    );
  }

  // Client-side category filtering
  const filteredProducts = activeCat
    ? products.filter((p) =>
        p.categories.some((c) => c.slug === activeCat),
      )
    : products;

  const largeImage = block.appearance === "large-photo";
  const columns = block.columns || 3;

  const renderProducts = () => {
    switch (block.appearance) {
      case "slider":
        return (
          <SliderView
            products={filteredProducts}
            columns={columns}
            largeImage={false}
          />
        );
      case "carousel":
        return (
          <CarouselView
            products={filteredProducts}
            columns={columns}
            largeImage={false}
          />
        );
      case "large-photo":
        return (
          <DefaultGrid
            products={filteredProducts}
            columns={columns}
            largeImage={true}
          />
        );
      default:
        return (
          <DefaultGrid
            products={filteredProducts}
            columns={columns}
            largeImage={false}
          />
        );
    }
  };

  return (
    <div className="products-layout">
      {block.showCategoryFilter && (
        <aside className="products-sidebar">
          <div className="products-sidebar-title">Kategorie</div>
          <ul className="products-sidebar-list">
            <li className="products-sidebar-item">
              <button
                className={`products-sidebar-link${activeCat === null ? " products-sidebar-link-active" : ""}`}
                onClick={() => setActiveCat(null)}
              >
                Všechny produkty
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id} className="products-sidebar-item">
                <button
                  className={`products-sidebar-link${activeCat === cat.slug ? " products-sidebar-link-active" : ""}`}
                  onClick={() => setActiveCat(cat.slug)}
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}
      {renderProducts()}
    </div>
  );
}
