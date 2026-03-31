import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CodeInputPanel from "../../components/CodeInputPanel";

// geminiLogo is an asset import — mock it
vi.mock("../../assets/geminiLogo.png", () => ({ default: "gemini-logo.png" }));

const defaultProps = {
    userInput: "",
    setUserInput: vi.fn(),
    isRunning: false,
    onRun: vi.fn(),
    isAiThinking: false,
    rateCooldown: 0,
    aiRequestsLeft: () => 5,
    onAnalyzeCode: vi.fn(),
};

function renderPanel(props = {}) {
    return render(<CodeInputPanel {...defaultProps} {...props} />);
}

describe("CodeInputPanel — stdin textarea", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders Input (stdin) placeholder", () => {
        renderPanel();
        expect(screen.getByPlaceholderText("Input (stdin)")).toBeInTheDocument();
    });

    it("shows current userInput value", () => {
        renderPanel({ userInput: "42" });
        expect(screen.getByPlaceholderText("Input (stdin)")).toHaveValue("42");
    });

    it("calls setUserInput when textarea changes", () => {
        renderPanel();
        fireEvent.change(screen.getByPlaceholderText("Input (stdin)"), {
            target: { value: "hello" },
        });
        expect(defaultProps.setUserInput).toHaveBeenCalledWith("hello");
    });
});

describe("CodeInputPanel — Run button", () => {

    beforeEach(() => vi.clearAllMocks());

    it("calls onRun when clicked", () => {
        renderPanel();
        // Run button has no text — it only has an SVG. Get it by its role.
        const buttons = screen.getAllByRole("button");
        fireEvent.click(buttons[0]); // Run is always first
        expect(defaultProps.onRun).toHaveBeenCalledTimes(1);
    });

    it("is disabled when isRunning is true", () => {
        renderPanel({ isRunning: true });
        const buttons = screen.getAllByRole("button");
        expect(buttons[0]).toBeDisabled();
    });

    it("is enabled when isRunning is false", () => {
        renderPanel({ isRunning: false });
        const buttons = screen.getAllByRole("button");
        expect(buttons[0]).not.toBeDisabled();
    });
});

describe("CodeInputPanel — Ask Gemini button", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders Ask Gemini text when not thinking", () => {
        renderPanel({ isAiThinking: false });
        expect(screen.getByText("Ask Gemini")).toBeInTheDocument();
    });

    it("renders Thinking… when isAiThinking is true", () => {
        renderPanel({ isAiThinking: true });
        expect(screen.getByText("Thinking…")).toBeInTheDocument();
    });

    it("calls onAnalyzeCode when clicked", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Ask Gemini"));
        expect(defaultProps.onAnalyzeCode).toHaveBeenCalledTimes(1);
    });

    it("is disabled when isAiThinking is true", () => {
        renderPanel({ isAiThinking: true });
        expect(screen.getByText("Thinking…").closest("button")).toBeDisabled();
    });

    it("is disabled when rateCooldown > 0", () => {
        renderPanel({ rateCooldown: 30 });
        expect(screen.getByText("Ask Gemini").closest("button")).toBeDisabled();
    });

    it("is enabled when not thinking and no cooldown", () => {
        renderPanel({ isAiThinking: false, rateCooldown: 0 });
        expect(screen.getByText("Ask Gemini").closest("button")).not.toBeDisabled();
    });
});

describe("CodeInputPanel — rate limit pill", () => {

    beforeEach(() => vi.clearAllMocks());

    it("shows cooldown seconds when rateCooldown > 0", () => {
        renderPanel({ rateCooldown: 42 });
        expect(screen.getByText("42s")).toBeInTheDocument();
    });

    it("shows requests left as X/5 when no cooldown", () => {
        renderPanel({ rateCooldown: 0, aiRequestsLeft: () => 3 });
        expect(screen.getByText("3/5")).toBeInTheDocument();
    });

    it("shows green pill when aiRequestsLeft >= 3", () => {
        renderPanel({ aiRequestsLeft: () => 4 });
        const pill = screen.getByText("4/5");
        expect(pill.className).toContain("green");
    });

    it("shows yellow pill when aiRequestsLeft is 1 or 2", () => {
        renderPanel({ aiRequestsLeft: () => 2 });
        const pill = screen.getByText("2/5");
        expect(pill.className).toContain("yellow");
    });

    it("shows red pill when aiRequestsLeft is 0", () => {
        renderPanel({ aiRequestsLeft: () => 0 });
        const pill = screen.getByText("0/5");
        expect(pill.className).toContain("red");
    });
});