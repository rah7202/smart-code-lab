import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach} from "vitest";
import RightPanel from "../../components/RightPanel"; // Adjust path if necessary

// 1. Mock the child components so we don't render their actual logic
vi.mock("../../components/CodeInputPanel", () => ({ 
    default: vi.fn(() => <div data-testid="mock-code-input" />)
}));
vi.mock("../../components/AIPanel", () => ({
    default: vi.fn(() => <div data-testid="mock-ai-panel" />)
}));
vi.mock("../../components/VersionPanel", () => ({
    default: vi.fn(() => <div data-testid="mock-version-panel" />)
}));

// Import the mocked components so we can check what props they received
import CodeInputPanel from "../../components/CodeInputPanel";
import AIPanel from "../../components/AIPanel";
import VersionPanel from "../../components/VersionPanel";

describe("RightPanel", () => {
    // 2. Create a base set of props to use in our tests
    const defaultProps = {
        roomId: "test-room",
        refreshHistory: 1,
        userInput: "test input",
        setUserInput: vi.fn(),
        isRunning: false,
        onRun: vi.fn(),
        userOutput: "test output",
        mode: "code" as const,
        history: [],
        setHistory: vi.fn(),
        isAiThinking: false,
        rateCooldown: 0,
        aiRequestsLeft: vi.fn(() => 5),
        aiQuestion: "",
        setAiQuestion: vi.fn(),
        onAnalyzeCode: vi.fn(),
        onAskQuestion: vi.fn(),
        aiOutputRef: { current: null },
        bottomRef: { current: null },
        handleRestoreSnapshot: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders all three child panels", () => {
        render(<RightPanel {...defaultProps} />);
        
        expect(screen.getByTestId("mock-code-input")).toBeInTheDocument();
        expect(screen.getByTestId("mock-ai-panel")).toBeInTheDocument();
        expect(screen.getByTestId("mock-version-panel")).toBeInTheDocument();
    });

    it("passes the correct props to CodeInputPanel", () => {
        render(<RightPanel {...defaultProps} />);
        
        // Check that the mock was called with the specific slice of props it needs
        expect(vi.mocked(CodeInputPanel)).toHaveBeenCalledWith(
            expect.objectContaining({
                userInput: "test input",
                setUserInput: defaultProps.setUserInput,
                isRunning: false,
                onRun: defaultProps.onRun,
                isAiThinking: false,
                rateCooldown: 0,
                aiRequestsLeft: defaultProps.aiRequestsLeft,
                onAnalyzeCode: defaultProps.onAnalyzeCode,
            }),
            undefined // React functional components receive a second argument (context/ref), usually an empty object in this mocked scenario
        );
    });

    it("passes the correct props to AIPanel", () => {
        render(<RightPanel {...defaultProps} />);
        
        expect(vi.mocked(AIPanel)).toHaveBeenCalledWith(
            expect.objectContaining({
                roomId: "test-room",
                mode: "code",
                history: [],
                setHistory: defaultProps.setHistory,
                isAiThinking: false,
                rateCooldown: 0,
                aiQuestion: "",
                setAiQuestion: defaultProps.setAiQuestion,
                onAskQuestion: defaultProps.onAskQuestion,
                isRunning: false,
                userOutput: "test output",
                aiOutputRef: defaultProps.aiOutputRef,
                bottomRef: defaultProps.bottomRef,
            }),
            undefined
        );
    });

    it("passes the correct props to VersionPanel", () => {
        render(<RightPanel {...defaultProps} />);
        
        expect(vi.mocked(VersionPanel)).toHaveBeenCalledWith(
            expect.objectContaining({
                roomId: "test-room",
                refreshHistory: 1,
                onRestore: defaultProps.handleRestoreSnapshot,
            }),
            undefined
        );
    });
});