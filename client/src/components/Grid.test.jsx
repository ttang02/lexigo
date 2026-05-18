import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid } from "./Grid.jsx";

const cells = Array.from({ length: 16 }, (_, i) => ({ letter: String.fromCharCode(65 + i), bonus: null }));

describe("Grid", () => {
  it("renders 16 tiles", () => {
    render(<Grid cells={cells} path={[]} onTap={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(16);
  });
  it("calls onTap with cell index", async () => {
    const onTap = vi.fn();
    render(<Grid cells={cells} path={[]} onTap={onTap} />);
    await userEvent.click(screen.getAllByRole("button")[3]);
    expect(onTap).toHaveBeenCalledWith(3);
  });
  it("marks tiles in path as selected", () => {
    render(<Grid cells={cells} path={[0, 1]} onTap={() => {}} />);
    expect(screen.getAllByRole("button")[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button")[2]).toHaveAttribute("aria-pressed", "false");
  });
  it("passes robotSelected to correct tiles", () => {
    const cells = Array.from({ length: 16 }, (_, i) => ({ letter: String.fromCharCode(65 + i % 26), bonus: null }));
    render(<Grid cells={cells} path={[]} robotPath={[2, 5]} onTap={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[2].className).toMatch(/amber/);
    expect(buttons[5].className).toMatch(/amber/);
    expect(buttons[0].className).not.toMatch(/amber/);
  });
});
