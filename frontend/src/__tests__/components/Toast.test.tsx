import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/Toast";

function TestTrigger() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast("success", "Saved!")}>Show Success</button>
      <button onClick={() => toast("error", "Failed!")}>Show Error</button>
      <button onClick={() => toast("info", "Info message")}>Show Info</button>
    </div>
  );
}

describe("Toast system", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a success toast when triggered", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByText("Show Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("shows an error toast when triggered", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByText("Show Error"));
    expect(screen.getByText("Failed!")).toBeInTheDocument();
  });

  it("auto-dismisses toast after 4 seconds", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByText("Show Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("can show multiple toasts simultaneously", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByText("Show Success"));
    await user.click(screen.getByText("Show Error"));

    expect(screen.getByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("Failed!")).toBeInTheDocument();
  });

  it("throws when useToast is used outside ToastProvider", () => {
    function Orphan() {
      useToast();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow("useToast must be used within ToastProvider");
  });
});
