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
  it("shows gold ring when robotSelected", () => {
    render(<Tile letter="A" bonus={null} index={0} selected={false} robotSelected={true} onTap={() => {}} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/amber/);
  });
});
