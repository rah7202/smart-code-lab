import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ── Mocks — must be before imports ────────────────────────────────────────

vi.mock("react-hot-toast", () => ({
    default: { error: vi.fn(), success: vi.fn() },
}));

import axios from "axios";
import toast from "react-hot-toast";
import { useAI } from "../../hooks/useAI";

const defaultProps = {
    userCode: 'console.log("hello")',
    userLang: "javascript",
    roomId: "room-test-123",
};

function renderAI(props = {}) {
    return renderHook(() => useAI({ ...defaultProps, ...props }));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useAI — initial state", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "AI response" } });
    });

    it("starts with isAiThinking = false", () => {
        const { result } = renderAI();
        expect(result.current.isAiThinking).toBe(false);
    });

    it("starts with rateCooldown = 0", () => {
        const { result } = renderAI();
        expect(result.current.rateCooldown).toBe(0);
    });

    it("starts with empty aiQuestion", () => {
        const { result } = renderAI();
        expect(result.current.aiQuestion).toBe("");
    });

    it("starts with mode = 'code'", () => {
        const { result } = renderAI();
        expect(result.current.mode).toBe("code");
    });

    it("starts with empty history before fetch resolves", () => {
        const { result } = renderAI();
        expect(result.current.history).toEqual([]);
    });

    it("fetches AI history on mount", async () => {
        const messages = [{ role: "user", content: "hello" }];
        vi.mocked(axios.get).mockResolvedValue({ data: messages });

        const { result } = renderAI();

        await waitFor(() => {
            expect(result.current.history).toEqual(messages);
        });

        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining("/ai/history/room-test-123")
        );
    });

    it("exposes all required functions", () => {
        const { result } = renderAI();
        expect(typeof result.current.analyzeCode).toBe("function");
        expect(typeof result.current.askQuestion).toBe("function");
        expect(typeof result.current.askAboutSelection).toBe("function");
        expect(typeof result.current.aiRequestsLeft).toBe("function");
        expect(typeof result.current.setAiQuestion).toBe("function");
        expect(typeof result.current.setHistory).toBe("function");
    });

    it("exposes DOM refs", () => {
        const { result } = renderAI();
        expect(result.current.bottomRef).toBeDefined();
        expect(result.current.aiOutputRef).toBeDefined();
    });
});

describe("useAI — analyzeCode", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "Here is my analysis." } });
    });

    it("sets mode to 'code' and adds to history", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            expect(result.current.mode).toBe("code");
            expect(result.current.history.some(m => m.role === "ai")).toBe(true);
        });
    });

    it("sends POST to /ai/generate with roomId", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const [url, body] = (axios.post as any).mock.calls[0];
        expect(url).toContain("/ai/generate");
        expect(body.roomId).toBe("room-test-123");
    });

    it("includes the userCode in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).toContain('console.log("hello")');
    });

    it("includes the userLang in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).toContain("javascript");
    });

    it("sets isAiThinking to false after response", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            expect(result.current.isAiThinking).toBe(false);
        });
    });

    it("adds error message to history when API fails", async () => {
        vi.mocked(axios.post).mockRejectedValue(new Error("Server down"));

        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            const lastMsg = result.current.history[result.current.history.length - 1];
            expect(lastMsg.role).toBe("ai");
            expect(lastMsg.content).toContain("AI Error");
        });
    });
});

describe("useAI — askQuestion", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "Answer to your question." } });
    });

    it("sets mode to 'question'", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is a pointer?"); });

        await waitFor(() => {
            expect(result.current.mode).toBe("question");
        });
    });

    it("does nothing when question is empty or whitespace", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("   "); });
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("clears aiQuestion after sending", async () => {
        const { result } = renderAI();

        act(() => { result.current.setAiQuestion("What is an array?"); });
        await act(async () => { result.current.askQuestion("What is an array?"); });

        await waitFor(() => {
            expect(result.current.aiQuestion).toBe("");
        });
    });

    it("adds user + ai messages to history", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is recursion?"); });

        await waitFor(() => {
            const hasUser = result.current.history.some(m => m.role === "user");
            const hasAI = result.current.history.some(m => m.role === "ai");
            expect(hasUser).toBe(true);
            expect(hasAI).toBe(true);
        });
    });

    it("does NOT include userCode in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is a loop?"); });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).not.toContain('console.log("hello")');
    });
});

describe("useAI — askAboutSelection", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "Selection analysis." } });
    });

    it("sets mode to 'selection'", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Explain this", "const x = 1;");
        });

        await waitFor(() => {
            expect(result.current.mode).toBe("selection");
        });
    });

    it("includes selected code in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Explain this", "const x = 1;");
        });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).toContain("const x = 1;");
    });

    it("includes the question in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Fix the bug", "let x = ;");
        });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).toContain("Fix the bug");
    });

    it("includes the language in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Optimise", "for(let i=0;i<n;i++){}");
        });

        await waitFor(() => expect(axios.post).toHaveBeenCalled());

        const body = (axios.post as any).mock.calls[0][1];
        expect(body.prompt).toContain("javascript");
    });
});

describe("useAI — rate limiting", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "ok" } });
    });

    it("aiRequestsLeft starts at 5", () => {
        const { result } = renderAI();
        expect(result.current.aiRequestsLeft()).toBe(5);
    });

    it("decrements aiRequestsLeft after each request", async () => {
        const { result } = renderAI();

        await act(async () => { result.current.askQuestion("q1"); });
        await waitFor(() => expect(result.current.aiRequestsLeft()).toBe(4));

        await act(async () => { result.current.askQuestion("q2"); });
        await waitFor(() => expect(result.current.aiRequestsLeft()).toBe(3));
    });

    it("shows toast error when rate limit is hit", async () => {
        const { result } = renderAI();

        for (let i = 0; i < 5; i++) {
            await act(async () => { result.current.askQuestion(`question ${i}`); });
        }

        await act(async () => { result.current.askQuestion("over limit"); });

        expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining("Rate limit reached")
        );
    });

    it("does not call API when rate limited", async () => {
        const { result } = renderAI();

        for (let i = 0; i < 5; i++) {
            await act(async () => { result.current.askQuestion(`q${i}`); });
        }

        const callsBefore = (axios.post as any).mock.calls.length;
        await act(async () => { result.current.askQuestion("blocked"); });

        expect((axios.post as any).mock.calls.length).toBe(callsBefore);
    });
});

describe("useAI — setHistory", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(axios.get).mockResolvedValue({ data: [] });
        vi.mocked(axios.post).mockResolvedValue({ data: { data: "response" } });
    });

    it("allows manually setting history", () => {
        const { result } = renderAI();

        act(() => {
            result.current.setHistory([
                { role: "user", content: "hi" },
                { role: "ai", content: "hello" },
            ]);
        });

        expect(result.current.history).toHaveLength(2);
        expect(result.current.history[0].content).toBe("hi");
    });

    it("allows clearing history by setting to empty array", async () => {
        const { result } = renderAI();

        await act(async () => { result.current.askQuestion("test"); });
        await waitFor(() => expect(result.current.history.length).toBeGreaterThan(0));

        act(() => { result.current.setHistory([]); });
        expect(result.current.history).toHaveLength(0);
    });
});