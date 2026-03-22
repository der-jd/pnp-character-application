import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input component", () => {
  it("renders with a label", () => {
    render(<Input label="Username" />);
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("associates label with input via htmlFor", () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInstanceOf(HTMLInputElement);
  });

  it("shows error message when error prop is set", () => {
    render(<Input label="Name" error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input label="Test" onChange={onChange} />);

    await user.type(screen.getByLabelText("Test"), "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders without label", () => {
    render(<Input placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("applies custom id", () => {
    render(<Input label="Custom" id="my-custom-id" />);
    expect(screen.getByLabelText("Custom")).toHaveAttribute("id", "my-custom-id");
  });

  it("is disabled when disabled prop is set", () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByLabelText("Disabled")).toBeDisabled();
  });
});
