import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid } from "./Grid.jsx";

const cells = Array.from({ length: 16 }, (_, i) => ({
  letter: String.fromCharCode(65 + i),
  bonus: null,
}));

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

  it("shows amber on tiles within stepIndex of robotPath", () => {
    // robotPath=[2,5], stepIndex=2 → both tiles 2 and 5 revealed
    render(
      <Grid
        cells={cells}
        path={[]}
        robotPath={[2, 5]}
        stepIndex={2}
        isHolding={false}
        onTap={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[2].className).toMatch(/amber/);
    expect(buttons[5].className).toMatch(/amber/);
    expect(buttons[0].className).not.toMatch(/amber/);
  });

  it("shows no amber when stepIndex=0 (no tiles revealed yet)", () => {
    render(
      <Grid
        cells={cells}
        path={[]}
        robotPath={[2, 5]}
        stepIndex={0}
        isHolding={false}
        onTap={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[2].className).not.toMatch(/amber/);
    expect(buttons[5].className).not.toMatch(/amber/);
  });

  it("shows success class on flashing tiles", () => {
    render(<Grid cells={cells} path={[]} flashPath={[0, 3]} onTap={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].className).toMatch(/success/);
    expect(buttons[3].className).toMatch(/success/);
    expect(buttons[1].className).not.toMatch(/success/);
  });

  // polyline only renders when !reduced; matchMedia stub in test-setup returns false (motion allowed)
  it("renders SVG polyline when path has 2 or more tiles", () => {
    render(<Grid cells={cells} path={[0, 1, 2]} onTap={() => {}} />);
    expect(document.querySelector("polyline")).toBeInTheDocument();
  });

  it("does not render polyline when path has fewer than 2 tiles", () => {
    render(<Grid cells={cells} path={[0]} onTap={() => {}} />);
    expect(document.querySelector("polyline")).not.toBeInTheDocument();
  });

  it("does not render polyline when path is empty", () => {
    render(<Grid cells={cells} path={[]} onTap={() => {}} />);
    expect(document.querySelector("polyline")).not.toBeInTheDocument();
  });
});
