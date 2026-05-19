import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FloatingScore } from "./FloatingScore.jsx";

describe("FloatingScore", () => {
  it("renders +N when score is set", () => {
    render(<FloatingScore score={12} scoreKey={1} />);
    expect(screen.getByText("+12")).toBeInTheDocument();
  });

  it("renders nothing when score is null", () => {
    const { container } = render(<FloatingScore score={null} scoreKey={0} />);
    expect(container.textContent).toBe("");
  });
});
