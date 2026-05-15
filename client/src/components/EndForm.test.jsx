import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EndForm } from "./EndForm.jsx";

describe("EndForm", () => {
  it("calls onSubmit with trimmed pseudo", async () => {
    const onSubmit = vi.fn();
    render(<EndForm score={120} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/pseudo/i), "  alice  ");
    await userEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(onSubmit).toHaveBeenCalledWith("alice");
  });
  it("shows validation error for empty pseudo", async () => {
    const onSubmit = vi.fn();
    render(<EndForm score={120} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /enregistrer/i }));
    expect(screen.getByText(/pseudo requis/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
