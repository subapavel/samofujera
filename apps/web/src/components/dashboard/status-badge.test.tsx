import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders known status with its default label", () => {
    render(<StatusBadge status="PAID" />);

    expect(screen.getByText("Zaplaceno")).toBeInTheDocument();
  });

  it("renders custom label override for known status", () => {
    render(<StatusBadge status="PAID" label="Custom Label" />);

    expect(screen.getByText("Custom Label")).toBeInTheDocument();
    expect(screen.queryByText("Zaplaceno")).not.toBeInTheDocument();
  });

  it("renders unknown status with the status string as label", () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);

    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
  });

  it("renders unknown status with custom label", () => {
    render(<StatusBadge status="UNKNOWN_STATUS" label="Custom" />);

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByText("UNKNOWN_STATUS")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusBadge status="ACTIVE" className="extra-class" />,
    );

    const badge = container.firstElementChild;
    expect(badge).toHaveClass("extra-class");
  });

  it.each([
    ["PENDING", "Čeká"],
    ["PAID", "Zaplaceno"],
    ["ACTIVE", "Aktivní"],
    ["SHIPPED", "Odesláno"],
    ["CANCELLED", "Zrušeno"],
    ["REFUNDED", "Vráceno"],
    ["DRAFT", "Koncept"],
    ["PUBLISHED", "Publikováno"],
    ["SCHEDULED", "Naplánováno"],
    ["ARCHIVED", "Archivováno"],
    ["BLOCKED", "Blokováno"],
  ])("renders %s status with label %s", (status, expectedLabel) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  it("renders icon for known statuses", () => {
    const { container } = render(<StatusBadge status="PAID" />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("h-3", "w-3");
  });

  it("does not render icon for unknown statuses", () => {
    const { container } = render(<StatusBadge status="SOMETHING_ELSE" />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeInTheDocument();
  });
});
