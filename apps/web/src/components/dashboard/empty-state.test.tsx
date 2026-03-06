import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

function TestIcon() {
  return <svg data-testid="empty-icon" />;
}

describe("EmptyState", () => {
  it("renders icon and title", () => {
    render(<EmptyState icon={<TestIcon />} title="No items found" />);

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No items found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon={<TestIcon />}
        title="No items found"
        description="Try adjusting your search filters"
      />,
    );

    expect(
      screen.getByText("Try adjusting your search filters"),
    ).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(
      <EmptyState icon={<TestIcon />} title="No items found" />,
    );

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        icon={<TestIcon />}
        title="No items found"
        action={<button data-testid="action-btn">Add item</button>}
      />,
    );

    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
    expect(screen.getByText("Add item")).toBeInTheDocument();
  });

  it("does not render action wrapper when not provided", () => {
    const { container } = render(
      <EmptyState icon={<TestIcon />} title="No items found" />,
    );

    // The only direct children should be the icon wrapper and the h3
    const rootDiv = container.firstElementChild!;
    // icon div + h3 = 2 children
    expect(rootDiv.children).toHaveLength(2);
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState
        icon={<TestIcon />}
        title="No items found"
        className="custom-class"
      />,
    );

    const rootDiv = container.firstElementChild;
    expect(rootDiv).toHaveClass("custom-class");
  });

  it("renders title as h3 heading", () => {
    render(<EmptyState icon={<TestIcon />} title="Empty" />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Empty");
  });
});
