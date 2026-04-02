import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AIPanel from "../../components/AIPanel";

vi.mock("../../assets/geminiLogo.png", () => ({ default: "gemini-logo.png" }));

vi.mock("react-hot-toast", () => {
  const toastMock = vi.fn(); // The default export (toast("..."))
  
  // Attach the other methods you might use (toast.error, toast.success)
  Object.assign(toastMock, {
    error: vi.fn(),
    success: vi.fn(),
  });
  
  return { default: toastMock };
});

import axios from "axios";
import toast from "react-hot-toast";

// axios.create() is mocked in setup.ts; use a loose typing here so we can assign mock methods safely.
const mockAxios = axios.create() as any;

const mockBottomRef = { current: null } as React.RefObject<HTMLDivElement | null>;
const mockOutputRef = { current: null } as React.RefObject<HTMLDivElement | null>;

const defaultProps = {
    roomId: "room-123",
    mode: "code" as const,
    history: [],
    setHistory: vi.fn(),
    isAiThinking: false,
    rateCooldown: 0,
    aiQuestion: "",
    setAiQuestion: vi.fn(),
    onAskQuestion: vi.fn(),
    isRunning: false,
    userOutput: "",
    aiOutputRef: mockOutputRef,
    bottomRef: mockBottomRef,
};

function renderPanel(props = {}) {
    return render(<AIPanel {...defaultProps} {...props} />);
}

describe("AIPanel — question input", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders the question textarea with correct placeholder", () => {
        renderPanel();
        expect(screen.getByPlaceholderText("Ask anything… (Enter to send)")).toBeInTheDocument();
    });

    it("calls setAiQuestion when textarea changes", () => {
        renderPanel();
        fireEvent.change(screen.getByPlaceholderText("Ask anything… (Enter to send)"), {
            target: { value: "What is recursion?" },
        });
        expect(defaultProps.setAiQuestion).toHaveBeenCalledWith("What is recursion?");
    });

    it("is disabled when isAiThinking is true", () => {
        renderPanel({ isAiThinking: true });
        expect(screen.getByPlaceholderText("Ask anything… (Enter to send)")).toBeDisabled();
    });

    it("is disabled when rateCooldown > 0", () => {
        renderPanel({ rateCooldown: 10 });
        expect(screen.getByPlaceholderText("Ask anything… (Enter to send)")).toBeDisabled();
    });

    it("calls onAskQuestion with aiQuestion when Enter is pressed", () => {
        renderPanel({ aiQuestion: "What is a pointer?" });
        fireEvent.keyDown(screen.getByPlaceholderText("Ask anything… (Enter to send)"), {
            key: "Enter", shiftKey: false,
        });
        expect(defaultProps.onAskQuestion).toHaveBeenCalledWith("What is a pointer?");
    });

    it("does NOT call onAskQuestion when Shift+Enter is pressed", () => {
        renderPanel({ aiQuestion: "multi line" });
        fireEvent.keyDown(screen.getByPlaceholderText("Ask anything… (Enter to send)"), {
            key: "Enter", shiftKey: true,
        });
        expect(defaultProps.onAskQuestion).not.toHaveBeenCalled();
    });

    it("does NOT call onAskQuestion when aiQuestion is empty", () => {
        renderPanel({ aiQuestion: "" });
        fireEvent.keyDown(screen.getByPlaceholderText("Ask anything… (Enter to send)"), {
            key: "Enter", shiftKey: false,
        });
        expect(defaultProps.onAskQuestion).not.toHaveBeenCalled();
    });

    it("send button calls onAskQuestion when aiQuestion has content", () => {
        renderPanel({ aiQuestion: "explain this" });
        // send button is the IoSend button — it has no text, get by role inside the relative div
        const sendBtn = screen.getAllByRole("button").find(
            (b) => b.className.includes("bg-white") && !b.className.includes("red")
        )!;
        fireEvent.click(sendBtn);
        expect(defaultProps.onAskQuestion).toHaveBeenCalledWith("explain this");
    });

    it("send button is disabled when aiQuestion is empty", () => {
        renderPanel({ aiQuestion: "" });
        const sendBtn = screen.getAllByRole("button").find(
            (b) => b.className.includes("bg-white") && !b.className.includes("red")
        )!;
        expect(sendBtn).toBeDisabled();
    });
});

describe("AIPanel — execution output", () => {

    beforeEach(() => vi.clearAllMocks());

    it("shows Output placeholder when not running and no output", () => {
        renderPanel({ isRunning: false, userOutput: "" });
        expect(screen.getByText("Output")).toBeInTheDocument();
    });

    it("shows Running… when isRunning is true", () => {
        renderPanel({ isRunning: true });
        expect(screen.getByText("Running…")).toBeInTheDocument();
    });

    it("shows userOutput when available", () => {
        renderPanel({ userOutput: "Hello, World!\n" });
        expect(screen.getByText(/Hello, World!/)).toBeInTheDocument();
    });
});

describe("AIPanel — chat history", () => {

    beforeEach(() => vi.clearAllMocks());

    it("shows empty state when history is empty and not thinking", () => {
        renderPanel({ history: [], isAiThinking: false });
        expect(screen.getByText("Click Ask Gemini or type a question above")).toBeInTheDocument();
    });

    it("renders user messages with 'You' label", () => {
        renderPanel({
            history: [{ role: "user", content: "What is a pointer?" }],
        });
        expect(screen.getByText("You")).toBeInTheDocument();
        expect(screen.getByText("What is a pointer?")).toBeInTheDocument();
    });

    it("renders ai messages with 'Gemini' label", () => {
        renderPanel({
            history: [{ role: "ai", content: "A pointer holds a memory address." }],
        });
        // There are two "Gemini" texts — header + message label
        const geminis = screen.getAllByText("Gemini");
        expect(geminis.length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("A pointer holds a memory address.")).toBeInTheDocument();
    });

    it("renders multiple messages in order", () => {
        renderPanel({
            history: [
                { role: "user", content: "Question one" },
                { role: "ai",   content: "Answer one"  },
                { role: "user", content: "Question two" },
            ],
        });
        expect(screen.getByText("Question one")).toBeInTheDocument();
        expect(screen.getByText("Answer one")).toBeInTheDocument();
        expect(screen.getByText("Question two")).toBeInTheDocument();
    });
});

describe("AIPanel — mode indicator", () => {

    beforeEach(() => vi.clearAllMocks());

    it("shows code review message when mode is code and thinking", () => {
        renderPanel({ isAiThinking: true, mode: "code" });
        expect(screen.getByText(/Reviewing full code/)).toBeInTheDocument();
    });

    it("shows selection message when mode is selection and thinking", () => {
        renderPanel({ isAiThinking: true, mode: "selection" });
        expect(screen.getByText(/Analyzing selected code/)).toBeInTheDocument();
    });

    it("shows question message when mode is question and thinking", () => {
        renderPanel({ isAiThinking: true, mode: "question" });
        expect(screen.getByText(/Answering your question/)).toBeInTheDocument();
    });

    it("does NOT show mode indicator when not thinking", () => {
        renderPanel({ isAiThinking: false, mode: "code" });
        expect(screen.queryByText(/Reviewing full code/)).not.toBeInTheDocument();
    });

    it("shows bounce dots in header when thinking", () => {
        const { container } = renderPanel({ isAiThinking: true });
        const dots = container.querySelectorAll(".animate-bounce");
        expect(dots.length).toBe(3);
    });
});

describe("AIPanel — clear chat", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockAxios.delete = vi.fn().mockResolvedValue({});
    });

    it("renders the Clear button", () => {
        renderPanel();
        expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("calls DELETE /ai/history/:roomId and setHistory([]) on clear", async () => {
        renderPanel({ history: [{ role: "user", content: "hi" }] });
        act(() => fireEvent.click(screen.getByText("Clear")));

        await waitFor(() => {
            expect(mockAxios.delete).toHaveBeenCalledWith(
                expect.stringContaining("/ai/history/room-123")
            );
            expect(defaultProps.setHistory).toHaveBeenCalledWith([]);
            expect(toast.success).toHaveBeenCalledWith("Chat cleared");
        });
    });

    it("shows toast error when DELETE fails", async () => {
        mockAxios.delete = vi.fn().mockRejectedValue(new Error("Server error"));
        renderPanel({ history: [{ role: "user", content: "hi" }] });

        act(() => fireEvent.click(screen.getByText("Clear")));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to clear chat");
        });
    });

    it("does not call DELETE when history is already empty", async () => {
        renderPanel({ history: [] });
        act(() => fireEvent.click(screen.getByText("Clear")));

        await waitFor(() => {
            expect(mockAxios.delete).not.toHaveBeenCalled();
        });
    });
});