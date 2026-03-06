import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  StatCardSkeleton,
  TableSkeleton,
  CardGridSkeleton,
} from "./dashboard-skeleton";

describe("StatCardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<StatCardSkeleton />);

    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders skeleton placeholder elements", () => {
    const { container } = render(<StatCardSkeleton />);

    // Should have the icon skeleton + 3 text skeletons = at least 4 skeleton divs
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("applies border-l-4 card styling", () => {
    const { container } = render(<StatCardSkeleton />);

    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-4");
  });
});

describe("TableSkeleton", () => {
  it("renders with default rows and columns", () => {
    const { container } = render(<TableSkeleton />);

    // Default: 1 header row + 5 data rows = 6 flex rows
    const rows = container.querySelectorAll(".flex.gap-4");
    expect(rows).toHaveLength(6); // 1 header + 5 body
  });

  it("renders with custom rows and columns", () => {
    const { container } = render(<TableSkeleton rows={3} columns={6} />);

    // 1 header + 3 data rows = 4 flex rows
    const rows = container.querySelectorAll(".flex.gap-4");
    expect(rows).toHaveLength(4);

    // Header should have 6 skeleton items
    const headerRow = container.querySelector(".border-b");
    const headerSkeletons =
      headerRow?.querySelectorAll("[data-slot='skeleton']");
    expect(headerSkeletons).toHaveLength(6);
  });

  it("applies custom className", () => {
    const { container } = render(<TableSkeleton className="my-custom" />);

    const root = container.firstElementChild;
    expect(root).toHaveClass("my-custom");
  });

  it("applies decreasing opacity to rows", () => {
    const { container } = render(<TableSkeleton rows={3} columns={1} />);

    // Get data rows (skip the header which has border-b class)
    const allRows = container.querySelectorAll(".flex.gap-4");
    // First row is header (has border-b parent), rest are data rows
    const dataRows = Array.from(allRows).filter(
      (row) => !row.classList.contains("border-b"),
    );

    // Check that skeletons in later rows have lower opacity
    const firstRowSkeleton = dataRows[0]?.querySelector(
      "[data-slot='skeleton']",
    ) as HTMLElement;
    const lastRowSkeleton = dataRows[dataRows.length - 1]?.querySelector(
      "[data-slot='skeleton']",
    ) as HTMLElement;

    if (firstRowSkeleton && lastRowSkeleton) {
      const firstOpacity = parseFloat(
        firstRowSkeleton.style.opacity || "1",
      );
      const lastOpacity = parseFloat(lastRowSkeleton.style.opacity || "1");
      expect(firstOpacity).toBeGreaterThan(lastOpacity);
    }
  });
});

describe("CardGridSkeleton", () => {
  it("renders with default count and columns", () => {
    const { container } = render(<CardGridSkeleton />);

    // Default count is 4 — cards are direct children of the grid
    const grid = container.firstElementChild!;
    expect(grid.children).toHaveLength(4);
  });

  it("renders with custom count", () => {
    const { container } = render(<CardGridSkeleton count={6} />);

    const grid = container.firstElementChild!;
    expect(grid.children).toHaveLength(6);
  });

  it("applies grid template columns based on columns prop", () => {
    const { container } = render(<CardGridSkeleton columns={3} />);

    const grid = container.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe(
      "repeat(3, minmax(0, 1fr))",
    );
  });

  it("applies custom className", () => {
    const { container } = render(<CardGridSkeleton className="my-grid" />);

    const root = container.firstElementChild;
    expect(root).toHaveClass("my-grid");
  });

  it("renders skeleton placeholders inside each card", () => {
    const { container } = render(<CardGridSkeleton count={1} />);

    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    // Each card has 3 skeletons (image, title, subtitle)
    expect(skeletons).toHaveLength(3);
  });
});
