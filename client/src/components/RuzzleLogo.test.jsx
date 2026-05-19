import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuzzleLogo } from "./RuzzleLogo.jsx";

describe("RuzzleLogo", () => {
  it("renders all 6 letters R U Z Z L E", () => {
    render(<RuzzleLogo />);
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("U")).toBeInTheDocument();
    expect(screen.getAllByText("Z")).toHaveLength(2);
    expect(screen.getByText("L")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<RuzzleLogo />);
    expect(screen.getByRole("img", { name: /ruzzle/i })).toBeInTheDocument();
  });
});
