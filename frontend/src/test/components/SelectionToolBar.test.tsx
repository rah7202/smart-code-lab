import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SelectionToolbar from "../../components/SelectionToolbar";

vi.mock("../../assets/geminiLogo.png", () => ({ default: "gemini-logo.png" }));

// Mock the Monaco Editor so it doesn't try to render or access browser globals
vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="mock-monaco-editor">Mocked Editor</div>,
}));

// If you are importing 'monaco-editor' directly anywhere, mock that too:
vi.mock("monaco-editor", () => ({
  editor: {
    create: vi.fn(),
    defineTheme: vi.fn(),
  },
}));

// ── Monaco editor mock ────────────────────────────────────────────────────────
// SelectionToolbar calls: onDidChangeCursorSelection, getSelection, getModel,
// getScrolledVisiblePosition, getDomNode, isEmpty on selection

function makeEditorMock({
    selectionEmpty = true,
    selectedText = "",
    scrolledPos = { top: 100, left: 50 },
    domNodeRect = { top: 0, left: 0, right: 800, bottom: 600 },
}: {
    selectionEmpty?: boolean;
    selectedText?: string;
    scrolledPos?: { top: number; left: number };
    domNodeRect?: Partial<DOMRect>;
} = {}) {
    const disposable = { dispose: vi.fn() };

    const mockSelection = {
        isEmpty: () => selectionEmpty,
        startLineNumber: 1,
        startColumn: 1,
    };

    const mockModel = {
        getValueInRange: () => selectedText,
    };

    let selectionHandler: (() => void) | null = null;

    const editor = {
        onDidChangeCursorSelection: vi.fn((handler) => {
            selectionHandler = handler;
            return disposable;
        }),
        getSelection: vi.fn(() => mockSelection),
        getModel: vi.fn(() => mockModel),
        getScrolledVisiblePosition: vi.fn(() => scrolledPos),
        getDomNode: vi.fn(() => ({
            getBoundingClientRect: () => ({ top: 0, left: 0, ...domNodeRect }),
        })),
        _triggerSelection: () => selectionHandler?.(),
    };

    return editor;
}

const defaultProps = {
    editorRef: { current: null } as any,
    onAsk: vi.fn(),
    isEditorReady: false,
};

describe("SelectionToolbar — not visible when nothing selected", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders nothing when isEditorReady is false", () => {
        const { container } = render(<SelectionToolbar {...defaultProps} isEditorReady={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when editorRef.current is null", () => {
        const { container } = render(
            <SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={{ current: null }} />
        );
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when selection is empty", () => {
        const editor = makeEditorMock({ selectionEmpty: true });
        const editorRef = { current: editor } as any;

        const { container } = render(
            <SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={editorRef} />
        );

        // Trigger selection change with empty selection
        act(() => editor._triggerSelection());

        expect(container.firstChild).toBeNull();
    });
});

describe("SelectionToolbar — visible when code is selected", () => {

    beforeEach(() => vi.clearAllMocks());

    function renderWithSelection(selectedText = "const x = 1;") {
        const editor = makeEditorMock({
            selectionEmpty: false,
            selectedText,
        });
        const editorRef = { current: editor } as any;

        const result = render(
            <SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={editorRef} />
        );

        act(() => editor._triggerSelection());
        return result;
    }

    it("shows Explain, Review, Fix, Optimise buttons after selection", () => {
        renderWithSelection();
        expect(screen.getByText("Explain")).toBeInTheDocument();
        expect(screen.getByText("Review")).toBeInTheDocument();
        expect(screen.getByText("Fix")).toBeInTheDocument();
        expect(screen.getByText("Optimise")).toBeInTheDocument();
    });

    it("shows Gemini label", () => {
        renderWithSelection();
        expect(screen.getByText("Gemini")).toBeInTheDocument();
    });

    it("shows Ask… button", () => {
        renderWithSelection();
        expect(screen.getByText("Ask…")).toBeInTheDocument();
    });

    it("shows lines selected count", () => {
        renderWithSelection("line one\nline two");
        expect(screen.getByText("2 lines selected")).toBeInTheDocument();
    });

    it("shows singular 'line' for single-line selection", () => {
        renderWithSelection("const x = 1;");
        expect(screen.getByText("1 line selected")).toBeInTheDocument();
    });
});

describe("SelectionToolbar — quick action buttons", () => {

    beforeEach(() => vi.clearAllMocks());

    function renderAndSelect(selectedText = "const x = 1;") {
        const editor = makeEditorMock({ selectionEmpty: false, selectedText });
        const editorRef = { current: editor } as any;
        render(<SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={editorRef} onAsk={defaultProps.onAsk} />);
        act(() => editor._triggerSelection());
    }

    it("calls onAsk with Explain prompt and selected code", () => {
        renderAndSelect("const x = 1;");
        fireEvent.click(screen.getByText("Explain"));
        expect(defaultProps.onAsk).toHaveBeenCalledWith(
            "Explain what this code does, step by step.",
            "const x = 1;"
        );
    });

    it("calls onAsk with Review prompt and selected code", () => {
        renderAndSelect("const x = 1;");
        fireEvent.click(screen.getByText("Review"));
        expect(defaultProps.onAsk).toHaveBeenCalledWith(
            "Review this code for bugs, edge cases, and improvements.",
            "const x = 1;"
        );
    });

    it("calls onAsk with Fix prompt", () => {
        renderAndSelect("const x = 1;");
        fireEvent.click(screen.getByText("Fix"));
        expect(defaultProps.onAsk).toHaveBeenCalledWith(
            "Fix any bugs or issues in this code and explain what you changed.",
            "const x = 1;"
        );
    });

    it("calls onAsk with Optimise prompt", () => {
        renderAndSelect("const x = 1;");
        fireEvent.click(screen.getByText("Optimise"));
        expect(defaultProps.onAsk).toHaveBeenCalledWith(
            "Optimise this code for performance and readability.",
            "const x = 1;"
        );
    });

    it("hides toolbar after a quick action is clicked", () => {
        renderAndSelect("const x = 1;");
        fireEvent.click(screen.getByText("Explain"));
        expect(screen.queryByText("Explain")).not.toBeInTheDocument();
    });
});

describe("SelectionToolbar — Ask… custom input", () => {

    beforeEach(() => vi.clearAllMocks());

    function renderAndSelect(selectedText = "const x = 1;") {
        const editor = makeEditorMock({ selectionEmpty: false, selectedText });
        const editorRef = { current: editor } as any;
        render(<SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={editorRef} />);
        act(() => editor._triggerSelection());
    }

    it("clicking Ask… reveals the custom input", () => {
        renderAndSelect();
        fireEvent.click(screen.getByText("Ask…"));
        expect(screen.getByPlaceholderText("Ask about selected code…")).toBeInTheDocument();
    });

    it("clicking Ask… again toggles the input off", () => {
        renderAndSelect();
        fireEvent.click(screen.getByText("Ask…"));
        fireEvent.click(screen.getByText("Ask…"));
        expect(screen.queryByPlaceholderText("Ask about selected code…")).not.toBeInTheDocument();
    });

    it("calls onAsk with custom question on Enter", () => {
        renderAndSelect("let y = 2;");
        fireEvent.click(screen.getByText("Ask…"));

        const input = screen.getByPlaceholderText("Ask about selected code…");
        fireEvent.change(input, { target: { value: "What is y used for?" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(defaultProps.onAsk).toHaveBeenCalledWith(
            "What is y used for?",
            "let y = 2;"
        );
    });

    it("closes input and hides toolbar after sending custom question", () => {
        renderAndSelect();
        fireEvent.click(screen.getByText("Ask…"));

        const input = screen.getByPlaceholderText("Ask about selected code…");
        fireEvent.change(input, { target: { value: "explain" } });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(screen.queryByText("Ask…")).not.toBeInTheDocument();
    });

    it("pressing Escape closes the input without sending", () => {
        renderAndSelect();
        fireEvent.click(screen.getByText("Ask…"));

        const input = screen.getByPlaceholderText("Ask about selected code…");
        fireEvent.change(input, { target: { value: "something" } });
        fireEvent.keyDown(input, { key: "Escape" });

        expect(screen.queryByPlaceholderText("Ask about selected code…")).not.toBeInTheDocument();
        expect(defaultProps.onAsk).not.toHaveBeenCalled();
    });

    it("does not call onAsk when custom question is empty", () => {
        renderAndSelect();
        fireEvent.click(screen.getByText("Ask…"));
        fireEvent.keyDown(
            screen.getByPlaceholderText("Ask about selected code…"),
            { key: "Enter" }
        );
        expect(defaultProps.onAsk).not.toHaveBeenCalled();
    });
});

describe("SelectionToolbar — outside click closes toolbar", () => {

    it("hides toolbar when clicking outside", () => {
        const editor = makeEditorMock({ selectionEmpty: false, selectedText: "x" });
        const editorRef = { current: editor } as any;
        render(<SelectionToolbar {...defaultProps} isEditorReady={true} editorRef={editorRef} />);
        act(() => editor._triggerSelection());

        expect(screen.getByText("Explain")).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        expect(screen.queryByText("Explain")).not.toBeInTheDocument();
    });
});