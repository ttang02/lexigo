import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RobotReplay } from "./RobotReplay.jsx";
import * as api from "../api.js";

vi.mock("../api.js", () => ({
  fetchSolution: vi.fn(),
}));

const CELLS = Array.from({ length: 16 }, (_, i) => ({
  letter: String.fromCharCode(65 + (i % 26)),
  bonus: null,
}));

const SOLUTIONS = [
  { word: "AB", path: [0, 1], score: 5 },
];

beforeEach(() => {
  api.fetchSolution.mockResolvedValue({ solutions: SOLUTIONS });
});

describe("RobotReplay", () => {
  it("shows loading state before fetch resolves", () => {
    api.fetchSolution.mockReturnValue(new Promise(() => {}));
    render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    expect(screen.getByText(/calcul/i)).toBeInTheDocument();
  });

  it("shows grid and progress after fetch", async () => {
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByRole("group", { name: /grid/i })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 1/)).toBeInTheDocument();
  });

  it("skip button calls onDone", async () => {
    const onDone = vi.fn();
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={onDone} />);
    });
    await userEvent.click(screen.getByText(/passer/i));
    expect(onDone).toHaveBeenCalled();
  });

  it("shows error message when fetch fails", async () => {
    api.fetchSolution.mockRejectedValue(new Error("network"));
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByText(/expir/i)).toBeInTheDocument();
  });

  it("shows empty message when no solutions", async () => {
    api.fetchSolution.mockResolvedValue({ solutions: [] });
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    expect(screen.getByText(/aucun mot/i)).toBeInTheDocument();
  });

  it("shows only revealed words in solution list initially (progressive reveal)", async () => {
    api.fetchSolution.mockResolvedValue({
      solutions: [
        { word: "AB", path: [0, 1], score: 5 },
        { word: "CD", path: [2, 3], score: 3 },
      ],
    });
    await act(async () => {
      render(<RobotReplay gridId="g1" cells={CELLS} onDone={() => {}} />);
    });
    // wordIndex = 0 → revealedSolutions = [AB] only
    expect(screen.queryByText("CD")).not.toBeInTheDocument();
  });
});
