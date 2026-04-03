import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("react-hot-toast", () => ({
    default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("../lib/authAxios", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

import api from "../../lib/authAxios";
import toast from "react-hot-toast";
import { useAI } from "../../hooks/useAI";

// ── Helper: create a mock SSE stream ──────────────────────────────────────
function mockStream(chunks: string[], error = false) {
    const encoder = new TextEncoder();
    const parts = chunks.map(c => `data: {"chunk":"${c}"}\n\n`);
    parts.push(`data: {"done":true}\n\n`);

    return {
        ok: !error,
        body: new ReadableStream({
            start(controller) {
                if (error) {
                    controller.error(new Error("stream failed"));
                    return;
                }
                for (const part of parts) {
                    controller.enqueue(encoder.encode(part));
                }
                controller.close();
            },
        }),
    };
}

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
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["Hello"]));
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

    it("fetches AI history on mount using api.get", async () => {
        const messages = [{ role: "user", content: "hello" }];
        vi.mocked(api.get).mockResolvedValue({ data: messages });

        const { result } = renderAI();

        await waitFor(() => {
            expect(result.current.history).toEqual(messages);
        });

        expect(api.get).toHaveBeenCalledWith(
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
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["Here is my analysis."]));
    });

    it("sets mode to 'code'", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });
        await waitFor(() => expect(result.current.mode).toBe("code"));
    });

    it("sends fetch POST to /ai/stream", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [url, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(url).toContain("/ai/stream");
        expect(body.roomId).toBe("room-test-123");
    });

    it("includes the userCode in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).toContain('console.log("hello")');
    });

    it("includes the userLang in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).toContain("javascript");
    });

    it("sets isAiThinking to false after response", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });
        await waitFor(() => expect(result.current.isAiThinking).toBe(false));
    });

    it("adds exactly ONE user + ONE ai message to history", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            const userMsgs = result.current.history.filter(m => m.role === "user");
            const aiMsgs = result.current.history.filter(m => m.role === "ai");
            expect(userMsgs).toHaveLength(1);  // ← no duplicates
            expect(aiMsgs).toHaveLength(1);    // ← no duplicates
        });
    });

    it("streams content into the AI message", async () => {
        global.fetch = vi.fn().mockResolvedValue(mockStream(["Hello", " world"]));
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            const aiMsg = result.current.history.find(m => m.role === "ai");
            expect(aiMsg?.content).toContain("Hello");
        });
    });

    it("adds error message when stream fails", async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, body: null });
        const { result } = renderAI();
        await act(async () => { result.current.analyzeCode(); });

        await waitFor(() => {
            const aiMsg = result.current.history.filter(m => m.role === "ai");
            expect(aiMsg.length).toBeGreaterThan(0);

            const lastAI = aiMsg[aiMsg.length -1];
            expect(lastAI?.content).toContain("AI Error");
        });
    });
});

describe("useAI — askQuestion", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["Answer."]));
    });

    it("sets mode to 'question'", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is a pointer?"); });
        await waitFor(() => expect(result.current.mode).toBe("question"));
    });

    it("does nothing when question is empty or whitespace", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("   "); });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("clears aiQuestion after sending", async () => {
        const { result } = renderAI();
        act(() => { result.current.setAiQuestion("What is an array?"); });
        await act(async () => { result.current.askQuestion("What is an array?"); });
        await waitFor(() => expect(result.current.aiQuestion).toBe(""));
    });

    it("adds exactly one user + one ai message", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is recursion?"); });

        await waitFor(() => {
            const userMsgs = result.current.history.filter(m => m.role === "user");
            const aiMsgs = result.current.history.filter(m => m.role === "ai");
            expect(userMsgs).toHaveLength(1);
            expect(aiMsgs).toHaveLength(1);
        });
    });

    it("does NOT include userCode in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => { result.current.askQuestion("What is a loop?"); });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).not.toContain('console.log("hello")');
    });
});

describe("useAI — askAboutSelection", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["Selection analysis."]));
    });

    it("sets mode to 'selection'", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Explain this", "const x = 1;");
        });
        await waitFor(() => expect(result.current.mode).toBe("selection"));
    });

    it("includes selected code in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Explain this", "const x = 1;");
        });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).toContain("const x = 1;");
    });

    it("includes the question in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Fix the bug", "let x = ;");
        });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).toContain("Fix the bug");
    });

    it("includes the language in the prompt", async () => {
        const { result } = renderAI();
        await act(async () => {
            result.current.askAboutSelection("Optimise", "for(let i=0;i<n;i++){}");
        });

        await waitFor(() => expect(fetch).toHaveBeenCalled());

        const [, options] = (fetch as any).mock.calls[0];
        const body = JSON.parse(options.body);
        expect(body.prompt).toContain("javascript");
    });
});

describe("useAI — rate limiting", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["ok"]));
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

    it("does not call fetch when rate limited", async () => {
        const { result } = renderAI();

        for (let i = 0; i < 5; i++) {
            await act(async () => { result.current.askQuestion(`q${i}`); });
        }

        const callsBefore = (fetch as any).mock.calls.length;
        await act(async () => { result.current.askQuestion("blocked"); });

        expect((fetch as any).mock.calls.length).toBe(callsBefore);
    });
});

describe("useAI — setHistory", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.get).mockResolvedValue({ data: [] });
        global.fetch = vi.fn().mockResolvedValue(mockStream(["response"]));
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