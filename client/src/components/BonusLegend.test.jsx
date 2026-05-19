import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// AnimatePresence holds children in DOM during exit animations in jsdom; mock it as pass-through
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, AnimatePresence: ({ children }) => children };
});

import { BonusLegend } from "./BonusLegend.jsx";

describe("BonusLegend", () => {
  it("is closed by default — bonus codes not visible", () => {
    render(<BonusLegend />);
    expect(screen.queryByText("DL")).not.toBeInTheDocument();
    expect(screen.queryByText("TW")).not.toBeInTheDocument();
  });

  it("shows all 4 bonus codes when opened", async () => {
    render(<BonusLegend />);
    await userEvent.click(screen.getByRole("button"));
    for (const code of ["DL", "TL", "DW", "TW"]) {
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  it("hides bonus codes when closed again", async () => {
    render(<BonusLegend />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.queryByText("DL")).not.toBeInTheDocument();
  });
});
