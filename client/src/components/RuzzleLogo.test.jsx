import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LexigoLogo } from "./RuzzleLogo.jsx";

describe("LexigoLogo", () => {
  it("renders all 6 letters L E X I G O", () => {
    render(<LexigoLogo />);
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("I")).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<LexigoLogo />);
    expect(screen.getByRole("img", { name: /lexigo/i })).toBeInTheDocument();
  });
});
