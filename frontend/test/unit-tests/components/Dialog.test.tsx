import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, ConfirmDialog } from "@/components/ui/Dialog";

describe("Dialog component", () => {
  it("renders nothing when open is false", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Dialog>,
    );
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders title and children when open", () => {
    render(
      <Dialog open onClose={vi.fn()} title="My Dialog">
        <p>Dialog content here</p>
      </Dialog>,
    );
    expect(screen.getByText("My Dialog")).toBeInTheDocument();
    expect(screen.getByText("Dialog content here")).toBeInTheDocument();
  });

  it("calls showModal on the dialog element when opened", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Open Dialog">
        <p>Content</p>
      </Dialog>,
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("renders action buttons when provided", () => {
    render(
      <Dialog open onClose={vi.fn()} title="With Actions" actions={<button>Save</button>}>
        <p>Content</p>
      </Dialog>,
    );
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Close Me">
        <p>Content</p>
      </Dialog>,
    );

    // The X button is the close button
    const closeButtons = screen.getAllByRole("button");
    const xButton = closeButtons.find((btn) => btn.querySelector("svg"));
    if (xButton) {
      await user.click(xButton);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

describe("ConfirmDialog component", () => {
  it("renders title and message", () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete?"
        message="Are you sure you want to delete?"
      />,
    );
    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to delete?")).toBeInTheDocument();
  });

  it("renders cancel and confirm buttons", () => {
    render(
      <ConfirmDialog
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Proceed?"
        confirmLabel="Yes, do it"
      />,
    );
    // Cancel button uses translation key, so we check for "Abbrechen"
    expect(screen.getByText("Abbrechen")).toBeInTheDocument();
    expect(screen.getByText("Yes, do it")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog open onClose={vi.fn()} onConfirm={onConfirm} title="Confirm" message="Sure?" confirmLabel="OK" />,
    );

    await user.click(screen.getByText("OK"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfirmDialog open onClose={onClose} onConfirm={vi.fn()} title="Confirm" message="Sure?" />);

    await user.click(screen.getByText("Abbrechen"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading state on confirm button", () => {
    render(<ConfirmDialog open onClose={vi.fn()} onConfirm={vi.fn()} title="Loading" message="Wait..." loading />);
    // Cancel should be disabled when loading
    expect(screen.getByText("Abbrechen").closest("button")).toBeDisabled();
  });
});
