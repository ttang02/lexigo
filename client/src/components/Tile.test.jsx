import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tile } from "./Tile.jsx";

describe("Tile", () => {
  it("renders letter", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });
  it("renders bonus badge", () => {
    render(<Tile letter="A" bonus="DL" index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByText("DL")).toBeInTheDocument();
  });
  it("calls onTap with index when clicked", async () => {
    const onTap = vi.fn();
    render(<Tile letter="A" bonus={null} index={5} selected={false} onTap={onTap} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onTap).toHaveBeenCalledWith(5);
  });
  it("has aria-label including letter and bonus", () => {
    render(<Tile letter="A" bonus="TW" index={0} selected={false} onTap={() => {}} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/A/);
    expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/triple.*word/i);
  });
  it("shows amber class when robotTrailOpacity > 0", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotTrailOpacity={1} onTap={() => {}} />);
    expect(screen.getByRole("button").className).toMatch(/amber/);
  });
  it("shows success class when flashing", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} flashing={true} onTap={() => {}} />);
    expect(screen.getByRole("button").className).toMatch(/success/);
  });
  it("shows normal class when robotTrailOpacity is 0 and not flashing", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotTrailOpacity={0} onTap={() => {}} />);
    expect(screen.getByRole("button").className).not.toMatch(/amber/);
    expect(screen.getByRole("button").className).not.toMatch(/success/);
  });
});
