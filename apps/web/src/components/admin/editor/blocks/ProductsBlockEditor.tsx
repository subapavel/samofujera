"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutGrid,
  Trash2,
  MoreVertical,
  Copy,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Rows3,
  Search,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Checkbox,
  Label,
} from "@samofujera/ui";
import { catalogApi } from "@samofujera/api-client";
import type {
  CategoryResponse,
  ProductResponse,
} from "@samofujera/api-client";
import type { ProductsBlock, ProductsAppearance, ProductsColumns } from "../types";

// ── Props ──

interface ProductsBlockEditorProps {
  block: ProductsBlock;
  onChange: (block: ProductsBlock) => void;
  onDelete: () => void;
  onCopy: () => void;
  onActiveChange?: (active: boolean) => void;
}

// ── Constants ──

const APPEARANCE_OPTIONS: { value: ProductsAppearance; label: string }[] = [
  { value: "default", label: "Výchozí" },
  { value: "large-photo", label: "Velká fotka" },
  { value: "slider", label: "Slider" },
  { value: "carousel", label: "Karusel" },
];

const COLUMNS_OPTIONS: { value: ProductsColumns; label: string }[] = [
  { value: 3, label: "3 sloupce" },
  { value: 4, label: "4 sloupce" },
  { value: 5, label: "5 sloupců" },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
  }).format(price);
}

// ── Insert Dialog ──

function InsertDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (mode: "category" | "manual", categoryId: string | null, productIds: string[]) => void;
  onCancel: () => void;
}) {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"category" | "manual">("category");

  useEffect(() => {
    let cancelled = false;
    catalogApi.getCategories().then((res) => {
      if (!cancelled && res.data) {
        setCategories(res.data);
      }
      if (!cancelled) setLoadingCategories(false);
    }).catch(() => {
      if (!cancelled) setLoadingCategories(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogApi.getProducts({ limit: 100 }).then((res) => {
      if (!cancelled && res.data) {
        setProducts(res.data.items);
      }
      if (!cancelled) setLoadingProducts(false);
    }).catch(() => {
      if (!cancelled) setLoadingProducts(false);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredProducts = searchQuery
    ? products.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : products;

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  }

  function handleOk() {
    if (activeTab === "category") {
      onConfirm("category", selectedCategoryId, []);
    } else {
      onConfirm("manual", null, selectedProductIds);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <LayoutGrid className="h-5 w-5 text-gray-600" />
            </div>
            <DialogTitle>Vložit výpis produktů</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "category" | "manual")}
          className="mt-2"
        >
          <TabsList className="w-full">
            <TabsTrigger value="category" className="flex-1">
              Z kategorie
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Ruční výběr
            </TabsTrigger>
          </TabsList>

          {/* Category tab */}
          <TabsContent value="category" className="mt-4">
            {loadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kategorie</Label>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                      selectedCategoryId === null ? "bg-gray-100 font-medium" : ""
                    }`}
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    {selectedCategoryId === null && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                    Všechny produkty
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 ${
                        selectedCategoryId === cat.id
                          ? "bg-gray-100 font-medium"
                          : ""
                      }`}
                      onClick={() => setSelectedCategoryId(cat.id)}
                    >
                      {selectedCategoryId === cat.id && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual tab */}
          <TabsContent value="manual" className="mt-4">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hledat produkty..."
                    className="pl-9"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  {filteredProducts.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-gray-500">
                      Žádné produkty nenalezeny
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <label
                        key={product.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                        {product.thumbnailUrl ? (
                          <img
                            src={product.thumbnailUrl}
                            alt=""
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-gray-200" />
                        )}
                        <span className="flex-1 text-sm">{product.title}</span>
                        <span className="text-xs text-gray-500">
                          {product.prices.CZK != null
                            ? formatPrice(product.prices.CZK)
                            : ""}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedProductIds.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Vybráno: {selectedProductIds.length}
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel}>
            Zavřít
          </Button>
          <Button
            onClick={handleOk}
            disabled={
              activeTab === "manual" && selectedProductIds.length === 0
            }
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Product Card (shared rendering) ──

function ProductCard({
  product,
  appearance,
}: {
  product: ProductResponse;
  appearance: ProductsAppearance;
}) {
  const price = product.prices.CZK;
  return (
    <a href={`/produkty/${product.slug}`} className="product-card">
      {product.thumbnailUrl ? (
        <img
          src={product.thumbnailUrl}
          alt={product.title}
          className={`product-card-image${appearance === "large-photo" ? " product-card-image-large" : ""}`}
        />
      ) : (
        <div
          className={`product-card-image bg-gray-200${appearance === "large-photo" ? " product-card-image-large" : ""}`}
        />
      )}
      <div className="product-card-title">{product.title}</div>
      {price != null && (
        <div className="product-card-price">{formatPrice(price)}</div>
      )}
    </a>
  );
}

// ── Main Editor ──

export function ProductsBlockEditor({
  block,
  onChange,
  onDelete,
  onCopy,
  onActiveChange,
}: ProductsBlockEditorProps) {
  const [isSelected, setIsSelected] = useState(false);
  const [showLayoutBar, setShowLayoutBar] = useState(false);
  const [showAppearanceDropdown, setShowAppearanceDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Data fetching state
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const isNew =
    block.mode === "category" &&
    block.categoryId === null &&
    block.productIds.length === 0;

  // Fetch categories for sidebar + toolbar dropdown
  useEffect(() => {
    let cancelled = false;
    catalogApi.getCategories().then((res) => {
      if (!cancelled && res.data) {
        setCategories(res.data);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fetch products based on block config
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);

    const fetchProducts = async () => {
      try {
        if (block.mode === "manual" && block.productIds.length > 0) {
          const res = await catalogApi.getProducts({ ids: block.productIds });
          if (!cancelled && res.data) {
            setProducts(res.data.items);
          }
        } else if (block.mode === "category") {
          const category = block.categoryId
            ? categories.find((c) => c.id === block.categoryId)?.slug
            : undefined;
          const res = await catalogApi.getProducts({
            category,
            limit: 50,
          });
          if (!cancelled && res.data) {
            setProducts(res.data.items);
          }
        }
      } catch {
        // silently fail in editor
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [isNew, block.mode, block.categoryId, block.productIds, categories]);

  // Click outside to deselect
  useEffect(() => {
    if (!isSelected) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsSelected(false);
        setShowLayoutBar(false);
        closeAllDropdowns();
        onActiveChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSelected, onActiveChange]);

  const closeAllDropdowns = useCallback(() => {
    setShowAppearanceDropdown(false);
    setShowColumnsDropdown(false);
    setShowCategoryDropdown(false);
    setShowMoreMenu(false);
  }, []);

  // New block → show insert dialog
  if (isNew) {
    return (
      <InsertDialog
        onConfirm={(mode, categoryId, productIds) => {
          onChange({ ...block, mode, categoryId, productIds });
        }}
        onCancel={onDelete}
      />
    );
  }

  // Determine grid class name based on appearance
  function getGridClassName(): string {
    if (block.appearance === "slider") {
      return `products-slider products-slider-${block.columns}`;
    }
    if (block.appearance === "carousel") {
      return `products-carousel`;
    }
    return `products-grid products-grid-${block.columns}`;
  }

  return (
    <div
      ref={wrapperRef}
      className="products-block relative cursor-pointer"
      onClick={() => {
        const next = !isSelected;
        setIsSelected(next);
        if (!next) {
          setShowLayoutBar(false);
          closeAllDropdowns();
        }
        onActiveChange?.(next);
      }}
    >
      {/* Live preview */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 p-8 text-sm text-gray-500">
          Zatím žádné produkty
        </div>
      ) : (
        <div className="products-layout">
          {/* Category sidebar */}
          {block.showCategoryFilter && (
            <div className="products-sidebar">
              <div className="products-sidebar-title">Kategorie</div>
              <ul className="products-sidebar-list">
                <li className="products-sidebar-item">
                  <span
                    className={`products-sidebar-link${
                      !block.categoryId ? " products-sidebar-link-active" : ""
                    }`}
                  >
                    Vše
                  </span>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id} className="products-sidebar-item">
                    <span
                      className={`products-sidebar-link${
                        block.categoryId === cat.id
                          ? " products-sidebar-link-active"
                          : ""
                      }`}
                    >
                      {cat.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Product grid / slider / carousel */}
          {block.appearance === "carousel" ? (
            <div className="products-carousel">
              <div className="products-carousel-track">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    appearance={block.appearance}
                  />
                ))}
              </div>
              <div className="products-carousel-dots">
                {products.map((product, i) => (
                  <span
                    key={product.id}
                    className={`products-carousel-dot${
                      i === 0 ? " products-carousel-dot-active" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className={getGridClassName()}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  appearance={block.appearance}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating toolbar */}
      {isSelected && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
          style={{ bottom: "calc(100% + 8px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Layout sub-toolbar */}
          {showLayoutBar && (
            <div className="mb-1 flex items-center rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg">
              {/* Appearance dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAppearanceDropdown(!showAppearanceDropdown);
                    setShowColumnsDropdown(false);
                    setShowCategoryDropdown(false);
                  }}
                >
                  Vzhled
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showAppearanceDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                    {APPEARANCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                          block.appearance === opt.value
                            ? "text-white font-medium"
                            : "text-white/70"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange({ ...block, appearance: opt.value });
                          setShowAppearanceDropdown(false);
                        }}
                      >
                        {block.appearance === opt.value && (
                          <Check className="mr-1.5 h-3 w-3" />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-0.5 h-4 w-px bg-white/20" />

              {/* Columns dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnsDropdown(!showColumnsDropdown);
                    setShowAppearanceDropdown(false);
                    setShowCategoryDropdown(false);
                  }}
                >
                  Počet sloupců
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showColumnsDropdown && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-40 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                    {COLUMNS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                          block.columns === opt.value
                            ? "text-white font-medium"
                            : "text-white/70"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange({ ...block, columns: opt.value });
                          setShowColumnsDropdown(false);
                        }}
                      >
                        {block.columns === opt.value && (
                          <Check className="mr-1.5 h-3 w-3" />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-0.5 h-4 w-px bg-white/20" />

              {/* Category dropdown (only for category mode) */}
              {block.mode === "category" && (
                <>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowAppearanceDropdown(false);
                        setShowColumnsDropdown(false);
                      }}
                    >
                      Zobrazit produkty
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                        <button
                          type="button"
                          className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                            block.categoryId === null
                              ? "text-white font-medium"
                              : "text-white/70"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onChange({ ...block, categoryId: null });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {block.categoryId === null && (
                            <Check className="mr-1.5 h-3 w-3" />
                          )}
                          Všechny produkty
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            className={`flex w-full items-center px-3 py-1.5 text-xs transition-colors hover:bg-white/10 ${
                              block.categoryId === cat.id
                                ? "text-white font-medium"
                                : "text-white/70"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChange({ ...block, categoryId: cat.id });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            {block.categoryId === cat.id && (
                              <Check className="mr-1.5 h-3 w-3" />
                            )}
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mx-0.5 h-4 w-px bg-white/20" />
                </>
              )}

              {/* Filter toggle */}
              <button
                type="button"
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors hover:bg-white/10 whitespace-nowrap ${
                  block.showCategoryFilter
                    ? "text-white font-medium"
                    : "text-white/70"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    ...block,
                    showCategoryFilter: !block.showCategoryFilter,
                  });
                }}
              >
                Filtr
                {block.showCategoryFilter && (
                  <Check className="h-3 w-3" />
                )}
              </button>
            </div>
          )}

          {/* Main toolbar */}
          <div className="relative flex items-center rounded-lg bg-gray-800 px-1 py-1.5 shadow-lg">
            {/* Add product */}
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                window.open("/admin/produkty/novy", "_blank");
              }}
            >
              <Plus className="h-3 w-3" />
              Přidat produkt
            </button>

            {/* Manage products */}
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-white/90 transition-colors hover:bg-white/10 whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                window.open("/admin/produkty", "_blank");
              }}
            >
              <Settings className="h-3 w-3" />
              Správa produktů
            </button>

            <div className="mx-0.5 h-4 w-px bg-white/20" />

            {/* Layout toggle */}
            <button
              type="button"
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors hover:bg-white/10 whitespace-nowrap ${
                showLayoutBar ? "text-white font-medium" : "text-white/90"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setShowLayoutBar(!showLayoutBar);
                closeAllDropdowns();
              }}
            >
              <Rows3 className="h-3 w-3" />
              Rozložení
            </button>

            <div className="mx-0.5 h-4 w-px bg-white/20" />

            {/* Delete */}
            <button
              type="button"
              className="flex items-center rounded px-2 py-1 text-white/90 transition-colors hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setIsSelected(false);
                closeAllDropdowns();
                onActiveChange?.(false);
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center rounded px-1.5 py-1 text-white/90 transition-colors hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSelected(false);
                      closeAllDropdowns();
                      onActiveChange?.(false);
                      onCopy();
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    Kopírovat
                  </button>
                </div>
              )}
            </div>

            {/* Arrow pointer */}
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  );
}
