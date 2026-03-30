import { useState, useCallback, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useParams, useLocation, useNavigate } from "react-router";
import toast from "react-hot-toast";
import axios from "axios";
import type { editor } from "monaco-editor";
import type * as Monaco from "monaco-editor";

import { registerMonacoThemes, getLanguageByValue } from "../languageOptions";
import { useCollaboration } from "../hooks/useCollaboration";
import { useAI } from "../hooks/useAI";
import { useEditorPersistence } from "../hooks/useEditorPersistence";

import Navbar from "./Navbar";
import UserPresenceBar from "./UserPresenceBar";
import Footer from "./Footer";
import RightPanel from "./RightPanel";
import SelectionToolbar from "./SelectionToolbar";

const URL = import.meta.env.VITE_BACKEND_URL;

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE: Monaco is the single source of truth for editor content.
//
// React state (userCode, userLang) is a MIRROR for things outside the editor
// (AI prompts, DB saves, rate limiting, navbar badge) — NOT the driver.
//
// All Monaco changes go through two imperative helpers:
//   applyCode(code)   — sets editor content without triggering onChange loop
//   applyLang(lang)   — sets model language + theme without re-mounting editor
//
// onChange only fires for REAL user keystrokes — all programmatic updates
// are gated by isRemoteUpdate ref so they skip the emit.
// ─────────────────────────────────────────────────────────────────────────────

export default function EditorPage() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const username = location.state?.username
        || localStorage.getItem("username")
        || "Anonymous";

    // ── UI state (mirrors Monaco, does NOT drive it) ──────────────────────────
    const [userLang, setUserLang] = useState<string>("javascript");
    const [userLangId, setUserLangId] = useState<number>(63);
    const [userTheme, setUserTheme] = useState<string>("vs-dark");
    const [fontSize, setFontSize] = useState<number>(18);
    const [isEditorReady, setIsEditorReady] = useState<boolean>(false);

    // ── Run state ─────────────────────────────────────────────────────────────
    const [userInput, setUserInput] = useState<string>("");
    const [userOutput, setUserOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState<boolean>(false);

    // ── Refs ──────────────────────────────────────────────────────────────────
    // isRemoteUpdate: blocks onChange from re-emitting programmatic setValue calls
    const isRemoteUpdate = useRef<boolean>(false);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const userLangRef = useRef<string>(userLang);
    const monacoRef = useRef<typeof Monaco | null>(null);

    // ── Auth guard ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!username || username === "Anonymous") {
            toast.error("Please enter your username to continue");
            navigate("/");
        }
    }, [roomId]);

    useEffect(() => {
        userLangRef.current = userLang;
    }, [userLang]);

    // ─────────────────────────────────────────────────────────────────────────
    // IMPERATIVE HELPERS
    // These are the ONLY functions that touch Monaco after mount.
    // Everything else (socket events, DB load, lang switch) calls these.
    // ─────────────────────────────────────────────────────────────────────────

    // Apply code to Monaco without triggering onChange → emit loop
    const applyCode = useCallback((code: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.getValue() === code) return; // no-op if already same

        isRemoteUpdate.current = true;
        editor.setValue(code);
        // isRemoteUpdate is cleared inside onChange immediately after
    }, []);

    // Apply language to Monaco model imperatively — no re-mount, no flicker
    const applyLang = useCallback((lang: string) => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        
        if (!monaco || !editor) return;

        const langConfig = getLanguageByValue(lang);
        const model = editor.getModel();

        isRemoteUpdate.current = true;
        
        if (model) {
            monaco.editor.setModelLanguage(model, langConfig.monacoLanguage);
        }
        // Respect current theme — only override if in dark mode
        if (userTheme !== "light") {
            monaco.editor.setTheme(langConfig.monacoTheme);
        }

        // Mirror into React state so navbar badge, AI prompts, etc. update
        setUserLang(lang);
        setUserLangId(langConfig.judge0Id);
    }, [userTheme]);

     // ── Persistence hook ──────────────────────────────────────────────────────
    const persistence = useEditorPersistence({
        roomId: roomId!,
        username,
        userLang,
        setUserLang,
        editorRef,
        isRemoteUpdate,
        // Called by persistence when DB load completes — apply imperatively
        onLoad: useCallback((code: string, lang: string) => {
            applyCode(code);
            applyLang(lang);
        }, [applyCode, applyLang]),
    });

    // ── Collaboration hook ────────────────────────────────────────────────────
    const { users, emitCursorMove, emitCodeChange } = useCollaboration({
        roomId: roomId!,
        username,
        editorRef,
        monacoInstance: monacoRef,
        // Called by socket when a collaborator edits code
        onCodeChange: useCallback((newCode: string) => {
            // Guard: don't wipe DB-loaded code with an empty socket burst
            const currentCode = editorRef.current?.getValue() ?? "";
            const starterCode = getLanguageByValue(userLangRef.current).starterCode;
            if (newCode === "" && currentCode !== "" && currentCode !==starterCode) return;
            
            applyCode(newCode);
            // Keep persistence hook's userCode in sync for AI / DB saves
            persistence.setUserCode(newCode);
        }, [applyCode]),
        // Called by socket when a collaborator switches language
        onLangChange: useCallback((lang: string) => {
            applyLang(lang);
        }, [applyLang]),
        isRemoteUpdate,
    });

   

    // ── AI hook ───────────────────────────────────────────────────────────────
    const ai = useAI({ userCode: persistence.userCode, userLang, roomId: roomId! });

    // ── Run code ──────────────────────────────────────────────────────────────
    const runCode = async () => {
        setIsRunning(true);
        try {
            const code = editorRef.current?.getValue() ?? persistence.userCode;
            const res = await axios.post(`${URL}/compile`, {
                code,
                userLangId,
                input: userInput,
            });
            await axios.post(`${URL}/snapshot/${roomId}`, { code, language: userLang });
            persistence.bumpRefreshHistory();
            setUserOutput(res.data.output ?? "No Output");
        } catch {
            setUserOutput("Error: Invalid Code");
        }
        setIsRunning(false);
    };

    // ── Language switch (from Navbar) ─────────────────────────────────────────
    // This is what Navbar's setUserLang prop calls
    const handleSetUserLang = useCallback(async (newLang: string) => {
        if (newLang === userLang) return;

        // Save current code into the per-language map before switching
        const currentCode = editorRef.current?.getValue() ?? "";
        const updatedMap = { ...persistence.codeMap, [userLang]: currentCode };
        persistence.setCodeMap(updatedMap);

        // Restore saved code for the new language, or use starter
        const newCode = updatedMap[newLang] ?? getLanguageByValue(newLang).starterCode;

        // Apply to Monaco imperatively — this is the lang switch for the LOCAL user
        applyCode(newCode);
        applyLang(newLang);

        // Keep persistence state in sync
        persistence.setUserCode(newCode);

        // Broadcast to collaborators
        emitCodeChange({ code: newCode, language: newLang });

        // Persist to DB
        try {
            await axios.post(`${URL}/room/${roomId}/save`, {
                code: newCode,
                language: newLang,
            });
        } catch {
            toast.error("Failed to save language change");
        }
    }, [userLang, persistence, applyCode, applyLang, emitCodeChange, roomId]);

    // ── Monaco mount ──────────────────────────────────────────────────────────
    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        setIsEditorReady(true);

        registerMonacoThemes(monaco);
        monaco.editor.setTheme(getLanguageByValue(userLang).monacoTheme);

        editor.onDidChangeCursorPosition((e: editor.ICursorPositionChangedEvent) => {
            emitCursorMove(e.position.lineNumber, e.position.column);
        });
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">

            <Navbar
                userLang={userLang}
                setUserLang={handleSetUserLang}
                userLangId={userLangId}
                setUserLangId={setUserLangId}
                userTheme={userTheme}
                setUserTheme={setUserTheme}
                fontSize={fontSize}
                setFontSize={setFontSize}
                handleDownloadCode={persistence.handleDownloadCode}
                handleSaveCode={persistence.handleSaveCode}
                handleClearEditor={persistence.handleClearEditor}
            />

            <UserPresenceBar users={users} />

            <div className="flex flex-1 min-h-0">

                {/* LEFT — Monaco editor (UNCONTROLLED — no value prop) */}
                <div className="w-2/3 p-1 mt-1 bg-gray-900 relative">
                    <Editor
                        height="100%"
                        language={getLanguageByValue(userLang).monacoLanguage}
                        theme={userTheme}
                        defaultValue={persistence.userCode}
                        onMount={handleEditorMount}
                        onChange={(value) => {
                            // This ONLY fires for real user keystrokes.
                            // All programmatic setValue calls set isRemoteUpdate=true first.
                            if (isRemoteUpdate.current) {
                                isRemoteUpdate.current = false;
                                return;
                            }
                            if (persistence.isLanguageSwitching.current) return;

                            const code = value || "";
                            persistence.handleEditorChange(code, userLang);
                            emitCodeChange({ code, language: userLang });
                        }}
                        options={{
                            fontSize,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                        }}
                    />

                    <SelectionToolbar
                        editorRef={editorRef}
                        onAsk={ai.askAboutSelection}
                        isEditorReady={isEditorReady}
                    />
                </div>

                <RightPanel
                    roomId={roomId!}
                    refreshHistory={persistence.refreshHistory}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    isRunning={isRunning}
                    onRun={runCode}
                    userOutput={userOutput}
                    mode={ai.mode}
                    history={ai.history}
                    setHistory={ai.setHistory}
                    isAiThinking={ai.isAiThinking}
                    rateCooldown={ai.rateCooldown}
                    aiRequestsLeft={ai.aiRequestsLeft}
                    aiQuestion={ai.aiQuestion}
                    setAiQuestion={ai.setAiQuestion}
                    onAnalyzeCode={ai.analyzeCode}
                    onAskQuestion={ai.askQuestion}
                    aiOutputRef={ai.aiOutputRef}
                    bottomRef={ai.bottomRef}
                    handleRestoreSnapshot={persistence.handleRestoreSnapshot}
                />
            </div>

            <div className="border-t border-white/10 mt-2">
                <Footer URL="https://github.com/rah7202/smart-code-lab" size={22} />
            </div>
        </div>
    );
}