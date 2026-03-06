import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./stat-card";

function TestIcon() {
  return <svg data-testid="test-icon" />;
}

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Revenue" value="$1,234" icon={<TestIcon />} />);

    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$1,234")).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(<StatCard title="Orders" value="42" icon={<TestIcon />} />);

    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <StatCard
        title="Orders"
        value="42"
        icon={<TestIcon />}
        description="Last 30 days"
      />,
    );

    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
  });

  it("does not render description section when no description or trend", () => {
    const { container } = render(
      <StatCard title="Orders" value="42" icon={<TestIcon />} />,
    );

    const descriptionDiv = container.querySelector(".mt-1.flex.items-center");
    expect(descriptionDiv).not.toBeInTheDocument();
  });

  it("renders positive trend with plus sign and TrendingUp icon", () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        trend={12}
      />,
    );

    expect(screen.getByText("+12%")).toBeInTheDocument();
    // TrendingUp icon should be present
    const trendSpan = screen.getByText("+12%").closest("span");
    expect(trendSpan).toHaveClass("text-success-foreground");
  });

  it("renders negative trend with TrendingDown icon", () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        trend={-5}
      />,
    );

    expect(screen.getByText("-5%")).toBeInTheDocument();
    const trendSpan = screen.getByText("-5%").closest("span");
    expect(trendSpan).toHaveClass("text-destructive");
  });

  it("renders zero trend as positive", () => {
    render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        trend={0}
      />,
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders trendLabel when provided", () => {
    render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        trend={12}
        trendLabel="vs last month"
      />,
    );

    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("renders trendLabel instead of description when both provided", () => {
    render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        trend={12}
        trendLabel="vs last month"
        description="Some description"
      />,
    );

    expect(screen.getByText("vs last month")).toBeInTheDocument();
    expect(screen.queryByText("Some description")).not.toBeInTheDocument();
  });

  it("applies default variant border class", () => {
    const { container } = render(
      <StatCard title="Revenue" value="$1,234" icon={<TestIcon />} />,
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-primary");
  });

  it("applies warm variant classes", () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        variant="warm"
      />,
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-golden-300");
  });

  it("applies success variant classes", () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        variant="success"
      />,
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-success");
  });

  it("applies warning variant classes", () => {
    const { container } = render(
      <StatCard
        title="Revenue"
        value="$1,234"
        icon={<TestIcon />}
        variant="warning"
      />,
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-warning");
  });
});
