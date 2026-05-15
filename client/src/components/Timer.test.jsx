import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timer } from "./Timer.jsx";

describe("Timer", () => {
  it("renders mm:ss format", () => {
    render(<Timer remainingMs={125_000} totalMs={120_000} />);
    expect(screen.getByText("2:05")).toBeInTheDocument();
  });
  it("renders 0:09 in danger style", () => {
    render(<Timer remainingMs={9_000} totalMs={120_000} />);
    const node = screen.getByText("0:09");
    expect(node.className).toMatch(/danger|red/i);
  });
});
