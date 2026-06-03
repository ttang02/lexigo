import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BotsPanel } from "./BotsPanel.jsx";

const BOTS = [
  {
    id: "a", name: "Alpha", emoji: "🦖", color: "#fff",
    timeline: [
      { word: "CHAT", score: 9, atMs: 1000 },
      { word: "PORTE", score: 12, atMs: 5000 },
    ],
    total: 21,
  },
  {
    id: "b", name: "Beta", emoji: "⚡", color: "#fff",
    timeline: [{ word: "OS", score: 2, atMs: 2000 }],
    total: 2,
  },
];

describe("BotsPanel", () => {
  it("renders nothing when there are no bots", () => {
    const { container } = render(<BotsPanel bots={[]} elapsedMs={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("counts only words found before the elapsed time", () => {
    render(<BotsPanel bots={BOTS} elapsedMs={1500} />);
    // Alpha found CHAT (9) at 1000ms but not PORTE (5000ms); Beta found nothing yet.
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("CHAT")).toBeInTheDocument();
  });

  it("accumulates score as time passes", () => {
    render(<BotsPanel bots={BOTS} elapsedMs={6000} />);
    expect(screen.getByText("21")).toBeInTheDocument(); // 9 + 12
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
