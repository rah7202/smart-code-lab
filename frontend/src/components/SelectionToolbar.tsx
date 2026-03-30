import { useEffect, useRef, useState } from "react";
import geminiLogo from "../assets/geminiLogo.png";
import { IoSend } from "react-icons/io5";
import { editor } from "monaco-editor"

interface ToolbarPos {
    top: number;
    left: number;
}

interface SelectionToolbarProps {
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
    onAsk: (question: string, selectedCode: string) => void;
    isEditorReady: boolean;
}

const QUICK_ACTIONS = [
    { label: "Explain", prompt: "Explain what this code does, step by step." },
    { label: "Review", prompt: "Review this code for bugs, edge cases, and improvements." },
    { label: "Fix", prompt: "Fix any bugs or issues in this code and explain what you changed." },
    { label: "Optimise", prompt: "Optimise this code for performance and readability." },
];

export default function SelectionToolbar({ editorRef, onAsk, isEditorReady }: SelectionToolbarProps) {
    const [pos, setPos] = useState<ToolbarPos | null>(null);
    const [selectedCode, setSelectedCode] = useState("");
    const [askMode, setAskMode] = useState(false);
    const [customQ, setCustomQ] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isEditorReady || !editorRef.current) return;

        const editor = editorRef.current;
        const disposable = editor.onDidChangeCursorSelection(() => {
            
            const selection = editor.getSelection();

            if (!selection || selection.isEmpty()) {
                setPos(null);
                setSelectedCode("");
                setAskMode(false);
                return;
            }

            const text = editor.getModel()?.getValueInRange(selection) ?? "";

            if (text.trim().length < 1) return;
            setSelectedCode(text);

            try {
                const domNode = editor.getDomNode();
                if (!domNode) return;

                const scrolledPos = editor.getScrolledVisiblePosition({
                    lineNumber: selection.startLineNumber,
                    column: selection.startColumn,
                });

                if (!scrolledPos) return;

                const editorRect = domNode.getBoundingClientRect();

                setPos({
                    top: editorRect.top + scrolledPos.top - 44,
                    left: editorRect.left + scrolledPos.left,
                });
            } catch {
                setPos(null);
            }
        });

        return () => disposable.dispose();
    }, [isEditorReady]); 

    // Focus input when ask mode opens
    useEffect(() => {
        if (askMode) setTimeout(() => inputRef.current?.focus(), 50);
    }, [askMode]);

    // Close on outside click
    useEffect(() => {
        if (!pos) return;
        const handler = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setPos(null);
                setAskMode(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [pos]);

    if (!pos) return null;

    const handleAction = (prompt: string) => {
        
        onAsk(prompt, selectedCode);
        setPos(null);
        setAskMode(false);
    };

    const handleCustomAsk = () => {
        if (!customQ.trim()) return;
        onAsk(customQ.trim(), selectedCode);
        setCustomQ("");
        setPos(null);
        setAskMode(false);
    };

    return (
        <div
            ref={toolbarRef}
            className="fixed z-[9999] flex flex-col gap-1"
            style={{ top: pos.top, left: pos.left }}
        >
            {/* Main pill toolbar */}
            <div
                className="flex items-center gap-0.5 px-1.5 py-1
                           bg-gray-900 border border-white/15 rounded-lg
                           shadow-2xl shadow-black/60
                           animate-in fade-in slide-in-from-top-1 duration-150"
            >
                {/* Gemini spark */}
                <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-white/10">
                    <img src={geminiLogo} className="w-4 h-4" />
                    <span className="text-[10px] text-white/40 font-medium">Gemini</span>
                </div>

                {/* Quick action buttons */}
                {QUICK_ACTIONS.map((action) => (
                    <button
                        key={action.label}
                        onClick={() => handleAction(action.prompt)}
                        className="px-2 py-1 text-xs text-white/60 hover:text-white
                                   hover:bg-white/8 rounded-md transition-all duration-100
                                   cursor-pointer whitespace-nowrap"
                    >
                        {action.label}
                    </button>
                ))}

                {/* Divider */}
                <div className="w-px h-4 bg-white/10 mx-0.5" />

                {/* Ask… toggle */}
                <button
                    onClick={() => setAskMode((o) => !o)}
                    className={`px-2 py-1 text-xs rounded-md transition-all duration-100 cursor-pointer
                                ${askMode
                            ? "bg-white/10 text-white"
                            : "text-white/50 hover:text-white hover:bg-white/8"
                        }`}
                >
                    Ask…
                </button>
            </div>

            {/* Custom question input — appears below when Ask… is clicked */}
            {askMode && (
                <div
                    className="flex gap-1.5 items-center px-2 py-1.5
                               bg-gray-900 border border-white/15 rounded-lg
                               shadow-xl shadow-black/40
                               animate-in fade-in slide-in-from-top-1 duration-100"
                >
                    <input
                        ref={inputRef}
                        value={customQ}
                        onChange={(e) => setCustomQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCustomAsk();
                            if (e.key === "Escape") { setAskMode(false); setCustomQ(""); }
                        }}
                        placeholder="Ask about selected code…"
                        className="flex-1 bg-transparent text-xs text-white/80
                                   placeholder:text-white/25 outline-none min-w-[200px]"
                    />
                    <button
                        onClick={handleCustomAsk}
                        disabled={!customQ.trim()}
                        className="w-6 h-6 flex items-center justify-center rounded-md
                               bg-white text-gray-900
                               disabled:opacity-25 hover:bg-yellow-500 active:scale-95
                               transition-all duration-150 shrink-0 mb-0.5 cursor-pointer
                               disabled:cursor-not-allowed"
                    >
                        <IoSend size={14} />
                    </button>
                </div>
            )}

            {/* Selected code preview — tiny pill below */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 self-start
                            bg-white/4 border border-white/8 rounded-md">
                <svg className="w-3 h-3 text-white/25" viewBox="0 0 16 16" fill="none">
                    <path d="M5 3L2 8l3 5M11 3l3 5-3 5M9 2l-2 12"
                        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] text-white/30 font-mono">
                    {selectedCode.split("\n").length} line{selectedCode.split("\n").length !== 1 ? "s" : ""} selected
                </span>
            </div>
        </div>
    );
}
