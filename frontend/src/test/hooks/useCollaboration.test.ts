import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useCollaboration } from "../../hooks/useCollaboration";
import { socket } from "../../socket";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MOCKS
// ─────────────────────────────────────────────────────────────────────────────

// Intercept socket listener registrations so we can trigger them manually
let socketListeners: Record<string, Function> = {};

vi.mock("../../socket", () => ({
    socket: {
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        on: vi.fn((event: string, callback: Function) => {
            socketListeners[event] = callback;
        }),
        off: vi.fn((event: string) => {
            delete socketListeners[event];
        }),
    }
}));

vi.mock("react-hot-toast", () => ({
    default: { error: vi.fn() }
}));

describe("useCollaboration", () => {
    let mockEditorRef: any;
    let mockMonacoInstance: any;
    let mockOnCodeChange: any;
    let mockOnLangChange: any;
    let mockIsRemoteUpdate: any;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem("token", "mock-token");
        socketListeners = {}; // Reset socket listeners
        document.head.innerHTML = ""; // Clear injected styles from previous tests

        // Setup base props
        mockEditorRef = {
            current: {
                getModel: vi.fn(() => ({})), // Returns a dummy model
                deltaDecorations: vi.fn(() => ["dec-1"]), // Returns dummy decoration IDs
            }
        };

        mockMonacoInstance = {
            current: {
                Range: class {
                    r: number;
                    c: number;
                    r2: number;
                    c2: number;
                    constructor(r: number, c: number, r2: number, c2: number) {
                        this.r = r;
                        this.c = c;
                        this.r2 = r2;
                        this.c2 = c2;
                    }
                } // Dummy Range class
            }
        };

        mockOnCodeChange = vi.fn();
        mockOnLangChange = vi.fn();
        mockIsRemoteUpdate = { current: false };
    });

    afterEach(() => {
        // Cleanup DOM after each test
        document.head.innerHTML = "";
    });

    const renderDefaultHook = () => {
        return renderHook(() => useCollaboration({
            roomId: "room-123",
            editorRef: mockEditorRef,
            monacoInstance: mockMonacoInstance,
            onCodeChange: mockOnCodeChange,
            onLangChange: mockOnLangChange,
            isRemoteUpdate: mockIsRemoteUpdate,
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("connects to socket and emits join on mount", async () => {
        renderDefaultHook();
        await waitFor(() => expect(socket.connect).toHaveBeenCalled());

        act(() => {
            socketListeners["connect"]?.();
        });

        expect(socket.emit).toHaveBeenCalledWith("join", { RoomId: "room-123" });
    });

    it("handles code-sync socket event", async () => {
        renderDefaultHook();
        await waitFor(() => expect(typeof socketListeners["code-sync"]).toBe("function"));

        act(() => {
            socketListeners["code-sync"]("new remote code");
        });

        expect(mockOnCodeChange).toHaveBeenCalledWith("new remote code");
    });

    it("handles connect_error socket event", async () => {
        renderDefaultHook();
        await waitFor(() => expect(typeof socketListeners["connect_error"]).toBe("function"));

        act(() => {
            socketListeners["connect_error"]();
        });

        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Connection failed"));
    });

    it("handles content-edited socket event", async () => {
        renderDefaultHook();
        await waitFor(() => expect(typeof socketListeners["content-edited"]).toBe("function"));

        act(() => {
            socketListeners["content-edited"]({ code: "updated code", language: "python" });
        });

        expect(mockOnLangChange).toHaveBeenCalledWith("python");
        expect(mockOnCodeChange).toHaveBeenCalledWith("updated code");
    });

    it("ignores content-edited if code is undefined or null", async () => {
        renderDefaultHook();
        await waitFor(() => expect(typeof socketListeners["content-edited"]).toBe("function"));

        act(() => {
            socketListeners["content-edited"]({ code: null, language: "python" });
            socketListeners["content-edited"]({ code: undefined, language: "python" });
        });

        expect(mockOnCodeChange).not.toHaveBeenCalled();
    });

    it("updates users list and captures current user color", async () => {
        const { result } = renderDefaultHook();
        
        const testUsers = [
            { username: "Alice", socketId: "socket1", color: "#ff0000" },
            { username: "TestUser", socketId: "socket2", color: "#00ff00" }, // The current user
        ];

        await waitFor(() => expect(typeof socketListeners["users"]).toBe("function"));

        act(() => {
            socketListeners["users"](testUsers);
        });

        expect(result.current.users).toHaveLength(2);
        expect(result.current.users[0].username).toBe("Alice");
    });

    
    it("updates users list when a user leaves", async () => {
        const { result } = renderDefaultHook();

        await waitFor(() => expect(typeof socketListeners["users"]).toBe("function"));

        act(() => {
            socketListeners["users"]([
                { username: "Alice", socketId: "socket1", color: "#ff0000" },
                { username: "TestUser", socketId: "socket2", color: "#00ff00" },
            ]);
        });

        expect(result.current.users).toHaveLength(2);

        act(() => {
            socketListeners["users"]([
                { username: "TestUser", socketId: "socket2", color: "#00ff00" },
            ]);
        });

        expect(result.current.users).toHaveLength(1);
    });

    it("handles cursor-move event and injects styles", () => {
        const { result } = renderDefaultHook();

        act(() => {
            socketListeners["cursor-move"]({
                line: 5,
                column: 10,
                username: "RemoteUser",
                color: "#123456",
                socketId: "socket-remote"
            });
        });

        // Verify Monaco deltaDecorations was called
        expect(mockEditorRef.current.deltaDecorations).toHaveBeenCalled();
        expect(result.current.decorationsRef.current.has("socket-remote")).toBe(true);

        // Verify the dynamic style tag was injected into the document head
        const styleTag = document.getElementById("cursor-style-socket-remote");
        expect(styleTag).not.toBeNull();
        expect(styleTag?.innerHTML).toContain("RemoteUser");
        expect(styleTag?.innerHTML).toContain("#123456");
    });

    it("emits cursor moves via emitCursorMove", () => {
        const { result } = renderDefaultHook();

        act(() => {
            result.current.emitCursorMove(10, 20);
        });

        expect(socket.emit).toHaveBeenCalledWith("cursor-move", {
            line: 10,
            column: 20,
        });
    });

    it("emits code change via emitCodeChange", () => {
        const { result } = renderDefaultHook();

        act(() => {
            result.current.emitCodeChange({ code: "my code", language: "java" });
        });

        expect(socket.emit).toHaveBeenCalledWith("content-edited", { code: "my code", language: "java" });
    });

    it("blocks emitCodeChange if isRemoteUpdate is true", () => {
        const { result } = renderDefaultHook();

        // Simulate that the editor is currently applying an update from the websocket
        mockIsRemoteUpdate.current = true;

        act(() => {
            result.current.emitCodeChange({ code: "my code", language: "java" });
        });

        // It should NOT emit, to prevent an infinite loop echoing back to the server
        expect(socket.emit).not.toHaveBeenCalledWith("content-edited", expect.anything());
        
        // It should reset the flag back to false
        expect(mockIsRemoteUpdate.current).toBe(false);
    });

    it("removes socket listeners on unmount", async () => {
        const { unmount } = renderDefaultHook();
        await waitFor(() => expect(socket.connect).toHaveBeenCalled());

        unmount();

        expect(socket.off).toHaveBeenCalledWith("code-sync");
        expect(socket.off).toHaveBeenCalledWith("content-edited");
        expect(socket.off).toHaveBeenCalledWith("users");
        expect(socket.off).toHaveBeenCalledWith("cursor-move");
        expect(socket.off).toHaveBeenCalledWith("connect_error");
        expect(socket.disconnect).toHaveBeenCalled();
    });
});