import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordList } from "./WordList.jsx";

describe("WordList", () => {
  it("shows total and word rows", () => {
    render(<WordList words={[{ word: "CHAT", score: 9 }, { word: "CHIEN", score: 13 }]} />);
    expect(screen.getByText("CHAT")).toBeInTheDocument();
    expect(screen.getByText("CHIEN")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
  });
  it("renders empty state", () => {
    render(<WordList words={[]} />);
    expect(screen.getByText(/aucun mot/i)).toBeInTheDocument();
  });
});
