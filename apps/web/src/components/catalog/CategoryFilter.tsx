"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogApi } from "@samofujera/api-client";

interface CategoryFilterProps {
  selectedCategory: string | undefined;
  onCategoryChange: (categorySlug: string | undefined) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.getCategories(),
  });

  const categories = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded bg-[var(--muted)]"
          />
        ))}
      </div>
    );
  }

  return (
    <nav aria-label="Kategorie">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Kategorie
      </h3>
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            onClick={() => onCategoryChange(undefined)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              !selectedCategory
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            }`}
          >
            Vse
          </button>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              onClick={() => onCategoryChange(category.slug)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                selectedCategory === category.slug
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              }`}
            >
              {category.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
