import { renderHook, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useEditorPersistence } from "../../hooks/useEditorPersistence";
import axios from "axios";
import toast from "react-hot-toast";
import debounce from "lodash.debounce";
import { socket } from "../../socket";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOCKS
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("react-hot-toast", () => {
    const toastMock = vi.fn();
    Object.assign(toastMock, {
        success: vi.fn(),
        error: vi.fn(),
    });
    return { default: toastMock };
});

beforeEach(() => {
  vi.clearAllMocks();

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
  }) as any;
});

vi.mock("../../socket", () => ({
    socket: { emit: vi.fn() }
}));

// Mock monaco-editor to prevent it from running DOM checks in JSDOM
vi.mock("monaco-editor", () => ({
    editor: {}
}));

vi.mock("../../languageOptions", () => ({
    getLanguageByValue: vi.fn((lang: string) => ({
        starterCode: `// starter for ${lang}`
    }))
}));

// Mock lodash.debounce so it executes synchronously in tests
vi.mock("lodash.debounce", () => ({
    default: vi.fn((fn) => {
        const debounced = (...args: any[]) => fn(...args);
        debounced.cancel = vi.fn();
        return debounced;
    })
}));

global.fetch = vi.fn().mockResolvedValue({ ok: true }) as any;

describe("useEditorPersistence", () => {
    let mockSetUserLang: any;
    let mockEditorRef: any;
    let mockIsRemoteUpdate: any;
    let mockOnLoad: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSetUserLang = vi.fn();
        mockIsRemoteUpdate = { current: false };
        mockOnLoad = vi.fn();
        mockEditorRef = {
            current: {
                getValue: vi.fn(() => "current editor code"),
                setValue: vi.fn(),
            }
        };

        // Mock Browser APIs
        window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
        window.URL.revokeObjectURL = vi.fn();
        navigator.sendBeacon = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const renderDefaultHook = (props: any = {}) => {
        return renderHook(() => useEditorPersistence({
            roomId: "room-123",
            username: "TestUser",
            userLang: "javascript",
            setUserLang: mockSetUserLang,
            editorRef: mockEditorRef,
            isRemoteUpdate: mockIsRemoteUpdate,
            onLoad: mockOnLoad,
            ...props
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. MOUNT & LOAD TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("loads room data on mount and calls onLoad if provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ 
            data: { code: "db code", language: "python" } 
        });

        renderDefaultHook();

        // Wait for the async load function to finish
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/room/room-123"));
        expect(mockOnLoad).toHaveBeenCalledWith("db code", "python");
    });

    it("loads room data and applies directly to Monaco if onLoad is NOT provided", async () => {
        vi.mocked(axios.get).mockResolvedValueOnce({ 
            data: { code: "fallback code", language: "cpp" } 
        });

        // Omit onLoad
        renderDefaultHook({ onLoad: undefined });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(mockSetUserLang).toHaveBeenCalledWith("cpp");
        expect(mockIsRemoteUpdate.current).toBe(true);
        expect(mockEditorRef.current.setValue).toHaveBeenCalledWith("fallback code");
    });

    it("handles failure to load room data", async () => {
        vi.mocked(axios.get).mockRejectedValueOnce(new Error("DB Error"));

        renderDefaultHook();

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(toast.error).toHaveBeenCalledWith("Failed to load room data");
    });

    it("cancels debounce on unmount", () => {
        const { unmount } = renderDefaultHook();
        
        // Find the mocked debounce cancel function
        const debounceMock = vi.mocked(debounce);
        const cancelSpy = debounceMock.mock.results[0].value.cancel;

        unmount();

        expect(cancelSpy).toHaveBeenCalled();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. EVENT LISTENERS TESTS (Ctrl+S & BeforeUnload)
    // ─────────────────────────────────────────────────────────────────────────

    it("saves code when Ctrl+S is pressed", () => {
        renderDefaultHook();
        vi.mocked(axios.post).mockResolvedValueOnce({});

        act(() => {
            const event = new KeyboardEvent("keydown", { ctrlKey: true, key: "s" });
            Object.defineProperty(event, "preventDefault", { value: vi.fn() });
            window.dispatchEvent(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });

        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/snapshot/room-123"), expect.any(Object));
    });

    it("sends a beacon on beforeunload", () => {
        renderDefaultHook();

        act(() => {
            window.dispatchEvent(new Event("beforeunload"));
        });

        expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/snapshot/room-123"),
        expect.objectContaining({
                method: "POST",
                keepalive: true,
                headers: expect.objectContaining({
                "Content-Type": "application/json",
                }),
            })
        );
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ACTION HANDLERS TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("handleSaveCode: saves code successfully", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({});
        const { result } = renderDefaultHook();

        await act(async () => {
            result.current.setUserCode("new code");
        });

        await act(async () => {
            await result.current.handleSaveCode();
        });

        expect(axios.post).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith("Code saved");
        expect(result.current.refreshHistory).toBe(1); // Increment verified
    });

    it("handleSaveCode: alerts when no code exists", async () => {
        const { result } = renderDefaultHook();

        await act(async () => {
            result.current.setUserCode(""); // Empty code
        });

        await act(async () => {
            await result.current.handleSaveCode();
        });

        expect(toast).toHaveBeenCalledWith("No Code to Save", { icon: "ℹ️" });
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("handleSaveCode: handles backend error", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("Network Error"));
        const { result } = renderDefaultHook();

        // Needs some code to pass the empty check
        await act(async () => { result.current.setUserCode("a"); });

        await act(async () => {
            await result.current.handleSaveCode();
        });

        expect(toast.error).toHaveBeenCalledWith("Failed to save code");
    });

    it("handleRestoreSnapshot: updates everything and emits", () => {
        const { result } = renderDefaultHook();

        act(() => {
            result.current.handleRestoreSnapshot({ code: "snapshot code", language: "python" });
        });

        expect(result.current.userCode).toBe("snapshot code");
        expect(mockSetUserLang).toHaveBeenCalledWith("python");
        expect(mockEditorRef.current.setValue).toHaveBeenCalledWith("snapshot code");
        expect(socket.emit).toHaveBeenCalledWith("content-edited", { code: "snapshot code", language: "python" });
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/save"), expect.any(Object));
        expect(toast.success).toHaveBeenCalledWith("Snapshot restored");
    });

    it("handleClearEditor: clears when content exists", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({});
        const { result } = renderDefaultHook();

        await act(async () => {
            await result.current.handleClearEditor();
        });

        expect(result.current.userCode).toBe("");
        expect(mockEditorRef.current.setValue).toHaveBeenCalledWith("");
        expect(socket.emit).toHaveBeenCalledWith("content-edited", { code: "", language: "javascript" });
        expect(toast.success).toHaveBeenCalledWith("Editor cleared");
    });

    it("handleClearEditor: handles empty editor check", async () => {
        // Mock the editor to return empty string
        mockEditorRef.current.getValue.mockReturnValueOnce("   "); 
        
        const { result } = renderDefaultHook();

        await act(async () => {
            await result.current.handleClearEditor();
        });

        expect(toast).toHaveBeenCalledWith("Nothing to clear", { icon: "ℹ️" });
        expect(axios.post).not.toHaveBeenCalled();
    });

    it("handleClearEditor: handles backend save error", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("Error"));
        const { result } = renderDefaultHook();

        await act(async () => {
            await result.current.handleClearEditor();
        });

        expect(toast.error).toHaveBeenCalledWith("Failed to clear editor");
    });

    it("handleDownloadCode: downloads file correctly", async () => {
        const { result } = renderDefaultHook();

        // Create a dummy anchor element to spy on its click method
        const mockAnchor = { href: "", download: "", click: vi.fn() };
        vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as any);

        await act(async () => {
            result.current.setUserCode("const a = 1;");
        });

        act(() => {
            result.current.handleDownloadCode();
        });

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchor.download).toContain(".js"); // javascript extension map
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Downloaded"));
    });

    it("handleDownloadCode: stops if no code", async () => {
        const { result } = renderDefaultHook();

        await act(async () => { result.current.setUserCode(""); });
        
        act(() => { result.current.handleDownloadCode(); });

        expect(toast).toHaveBeenCalledWith("No Code to Download", { icon: "ℹ️" });
    });

    it("handleEditorChange: updates state and triggers debounced save", () => {
        const { result } = renderDefaultHook();

        act(() => {
            result.current.handleEditorChange("typed code", "javascript");
        });

        expect(result.current.userCode).toBe("typed code");
        expect(result.current.codeMap["javascript"]).toBe("typed code");
        // Our mock debounce runs synchronously
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/save"), { code: "typed code", language: "javascript" });
    });

    it("bumpRefreshHistory: increments refresh count", () => {
        const { result } = renderDefaultHook();
        expect(result.current.refreshHistory).toBe(0);

        act(() => {
            result.current.bumpRefreshHistory();
        });

        expect(result.current.refreshHistory).toBe(1);
    });
});