import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Leaderboard } from "./Leaderboard.jsx";

describe("Leaderboard", () => {
  it("renders rows in given order", () => {
    render(<Leaderboard rows={[{ pseudo: "a", score: 100 }, { pseudo: "b", score: 50 }]} />);
    const tds = screen.getAllByRole("cell");
    expect(tds[1]).toHaveTextContent("a");
    expect(tds[2]).toHaveTextContent("100");
  });
  it("shows empty state when no rows", () => {
    render(<Leaderboard rows={[]} />);
    expect(screen.getByText(/aucun score/i)).toBeInTheDocument();
  });
});
