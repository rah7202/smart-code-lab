import { render, screen, act, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
//import { MemoryRouter } from "react-router";
import { MemoryRouter } from "react-router";
import axios from "axios";
import toast from "react-hot-toast";
import EditorPage from "../../components/EditorPage"; // Adjust path if needed

// ─────────────────────────────────────────────────────────────────────────────
// 1. GLOBAL MOCKS & CALLBACK CAPTURES
// ─────────────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

// Mock React Router
vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useParams: () => ({ roomId: "test-room" }),
        // Wrap this return in vi.fn() so we can override it!
        useLocation: vi.fn(() => ({ state: { username: "TestUser" } })), 
    };
});

// Mock Axios & Toast
vi.mock("react-hot-toast", () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

// Mock Language Options
vi.mock("../../languageOptions", () => ({
    registerMonacoThemes: vi.fn(),
    getLanguageByValue: (val: string) => ({
        monacoLanguage: val,
        monacoTheme: "vs-dark",
        judge0Id: 63,
        starterCode: "// starter"
    })
}));

// Variables to capture inline callbacks passed to hooks
let capturedOnLoad: (code: string, lang: string) => void;
let capturedOnCodeChange: (code: string) => void;
let capturedOnLangChange: (lang: string) => void;

const mockPersistence = {
    userCode: "console.log('hello')",
    setUserCode: vi.fn(),
    refreshHistory: 0,
    bumpRefreshHistory: vi.fn(),
    codeMap: {},
    setCodeMap: vi.fn(),
    handleEditorChange: vi.fn(),
    isLanguageSwitching: { current: false },
    handleDownloadCode: vi.fn(),
    handleSaveCode: vi.fn(),
    handleClearEditor: vi.fn(),
    handleRestoreSnapshot: vi.fn()
};

vi.mock("../../hooks/useEditorPersistence", () => ({
    useEditorPersistence: (props: any) => {
        capturedOnLoad = props.onLoad;
        return mockPersistence;
    }
}));

const mockCollaboration = {
    users: [],
    emitCursorMove: vi.fn(),
    emitCodeChange: vi.fn()
};

vi.mock("../../hooks/useCollaboration", () => ({
    useCollaboration: (props: any) => {
        capturedOnCodeChange = props.onCodeChange;
        capturedOnLangChange = props.onLangChange;
        return mockCollaboration;
    }
}));

vi.mock("../../hooks/useAI", () => ({
    useAI: () => ({
        mode: "code",
        history: [],
        setHistory: vi.fn(),
        isAiThinking: false,
        rateCooldown: 0,
        aiRequestsLeft: vi.fn(() => 5),
        aiQuestion: "",
        setAiQuestion: vi.fn(),
        analyzeCode: vi.fn(),
        askQuestion: vi.fn(),
        askAboutSelection: vi.fn(),
        aiOutputRef: { current: null },
        bottomRef: { current: null }
    })
}));

// Mock Editor and Sub-components
let capturedEditorOnMount: any;
let capturedEditorOnChange: any;

vi.mock("@monaco-editor/react", () => ({
    default: ({ onMount, onChange }: any) => {
        capturedEditorOnMount = onMount;
        capturedEditorOnChange = onChange;
        return <div data-testid="mock-editor">Editor</div>;
    }
}));

vi.mock("../../components/Navbar", () => ({
    default: ({ setUserLang }: any) => (
        <div data-testid="mock-navbar">
            <button data-testid="switch-lang" onClick={() => setUserLang("python")}>Lang</button>
            <button data-testid="switch-same-lang" onClick={() => setUserLang("javascript")}>Same Lang</button>
        </div>
    )
}));
vi.mock("../../components/UserPresenceBar", () => ({ default: () => <div data-testid="mock-presence" /> }));
vi.mock("../../components/RightPanel", () => ({ 
    default: ({ onRun }: any) => (
        <div data-testid="mock-right-panel">
            <button data-testid="run-btn" onClick={onRun}>Run</button>
        </div>
    ) 
}));
vi.mock("../../components/SelectionToolbar", () => ({ default: () => <div data-testid="mock-selection" /> }));
vi.mock("../../components/Footer", () => ({ default: () => <div data-testid="mock-footer" /> }));

// ─────────────────────────────────────────────────────────────────────────────
// 2. TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("EditorPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Storage.prototype.getItem = vi.fn(() => null);
    });


    it("renders components when authenticated", () => {
        render(<MemoryRouter><EditorPage /></MemoryRouter>);
        expect(screen.getByTestId("mock-navbar")).toBeInTheDocument();
        expect(screen.getByTestId("mock-editor")).toBeInTheDocument();
        expect(screen.getByTestId("mock-right-panel")).toBeInTheDocument();
    });

    it("handles Monaco mount and cursor changes", () => {
        render(<MemoryRouter><EditorPage /></MemoryRouter>);
        
        const mockMonaco = { editor: { setTheme: vi.fn() } };
        const mockEditor = {
            onDidChangeCursorPosition: vi.fn((cb) => cb({ position: { lineNumber: 1, column: 5 } }))
        };

        act(() => {
            capturedEditorOnMount(mockEditor, mockMonaco);
        });

        expect(mockCollaboration.emitCursorMove).toHaveBeenCalledWith(1, 5);
    });

    it("handles local editor code changes (onChange)", () => {
        render(<MemoryRouter><EditorPage /></MemoryRouter>);
        
        act(() => {
            capturedEditorOnChange("new local code");
        });

        expect(mockPersistence.handleEditorChange).toHaveBeenCalledWith("new local code", "javascript");
        expect(mockCollaboration.emitCodeChange).toHaveBeenCalledWith({ code: "new local code", language: "javascript" });
    });

    it("executes runCode successfully", async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: { output: "Success!" } });
        render(<MemoryRouter><EditorPage /></MemoryRouter>);

        await act(async () => {
            fireEvent.click(screen.getByTestId("run-btn"));
        });

        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/compile"), expect.any(Object));
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/snapshot/test-room"), expect.any(Object));
        expect(mockPersistence.bumpRefreshHistory).toHaveBeenCalled();
    });

    it("handles runCode failure", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("Network Error"));
        render(<MemoryRouter><EditorPage /></MemoryRouter>);

        await act(async () => {
            fireEvent.click(screen.getByTestId("run-btn"));
        });
        
        expect(axios.post).toHaveBeenCalledTimes(1); // Fails on compile, doesn't reach snapshot
    });

    it("handles language switch from Navbar", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({});
        render(<MemoryRouter><EditorPage /></MemoryRouter>);

        // Mount editor so applyLang doesn't early-return
        const mockModel = {};
        const mockMonaco = { editor: { setTheme: vi.fn(), setModelLanguage: vi.fn() } };
        const mockEditor = {
            getValue: () => "current code",
            setValue: vi.fn(),
            getModel: () => mockModel,
            onDidChangeCursorPosition: vi.fn()
        };
        act(() => { capturedEditorOnMount(mockEditor, mockMonaco); });

        // Trigger lang switch
        await act(async () => {
            fireEvent.click(screen.getByTestId("switch-lang"));
        });

        expect(mockPersistence.setCodeMap).toHaveBeenCalled();
        expect(mockCollaboration.emitCodeChange).toHaveBeenCalled();
        expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/save"), expect.any(Object));
    });

    it("ignores language switch if it's the same language", async () => {
        render(<MemoryRouter><EditorPage /></MemoryRouter>);
        await act(async () => {
            fireEvent.click(screen.getByTestId("switch-same-lang"));
        });
        // Should early return and not call setCodeMap
        expect(mockPersistence.setCodeMap).not.toHaveBeenCalled();
    });

    it("handles language change error when saving to DB", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("DB Error"));
        render(<MemoryRouter><EditorPage /></MemoryRouter>);

        await act(async () => {
            fireEvent.click(screen.getByTestId("switch-lang"));
        });

        expect(toast.error).toHaveBeenCalledWith("Failed to save language change");
    });

    it("handles remote hook events: onLoad, onLangChange, onCodeChange", () => {
        render(<MemoryRouter><EditorPage /></MemoryRouter>);
        
        // Setup Editor ref
        const mockEditor = {
            getValue: () => "old code",
            setValue: vi.fn(),
            getModel: () => ({}),
            onDidChangeCursorPosition: vi.fn()
        };
        const mockMonaco = { editor: { setTheme: vi.fn(), setModelLanguage: vi.fn() } };
        act(() => { capturedEditorOnMount(mockEditor, mockMonaco); });

        act(() => {
            // Trigger persistence load
            capturedOnLoad("loaded code", "python");
            // Trigger remote lang change
            capturedOnLangChange("javascript");
            // Trigger remote code change
            capturedOnCodeChange("remote socket code");
        });

        expect(mockEditor.setValue).toHaveBeenCalledWith("loaded code");
        expect(mockEditor.setValue).toHaveBeenCalledWith("remote socket code");
        expect(mockPersistence.setUserCode).toHaveBeenCalledWith("remote socket code");
        expect(mockMonaco.editor.setModelLanguage).toHaveBeenCalledTimes(2); // Once for load, once for lang change
    });
});