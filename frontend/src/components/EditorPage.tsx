import { useState, useCallback, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useParams, useLocation, useNavigate } from "react-router";
import toast from "react-hot-toast";
import axios from "axios"

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

export default function EditorPage() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const username = location.state?.username || localStorage.getItem("username") || "Anonymous";

    //-------CORE--EDITOR--STATE---------------------------------
    const [userLang, setUserLang] = useState<string>("javascript");
    const [userLangId, setUserLangId] = useState<number>(63);
    const [userTheme, setUserTheme] = useState<string>("vs-dark");
    const [fontSize, setFontSize] = useState<number>(18);
    const [isEditorReady, setIsEditorReady] = useState<boolean>(false);
    const isRemoteUpdate = useRef<boolean>(false);

    // run state 
    const [userInput, setUserInput] = useState<string>("");
    const [userOutput, setUserOutput] = useState<string>("");
    const [isRunning, setIsRunning] = useState<boolean>(false);

    //-------AUTH--GUARD--------------------------------------------
    useEffect(() => {
        if (!username || username === "Anonymous") {
            toast.error("Please enter your username to continue");
            navigate("/");
        }
    }, [roomId]);

    // ── Collaboration hook ────────────────────────────────────────────────────
    const { users, editorRef, emitCursorMove, emitCodeChange } = useCollaboration({
        roomId: roomId!,
        username,
        onCodeChange: useCallback((newCode: string) => {
            persistence.setUserCode((current: string) => {
                if (newCode === "" && current !== "" && current !== getLanguageByValue(userLang).starterCode) {
                    return current;
                }
                if (editorRef.current && editorRef.current.getValue() !== newCode) {
                    isRemoteUpdate.current = true;
                    editorRef.current.setValue(newCode);
                }
                return newCode;
            });
        }, [userLang]),
        setUserLang,
        isRemoteUpdate,
    });

    // ── Persistence hook (save/load/restore/clear/download) ───────────────────
    const persistence = useEditorPersistence({
        roomId: roomId!,
        username,
        userLang,
        setUserLang,
        editorRef,
        isRemoteUpdate,
    });

    //-------AI--HOOK--------------------------------------------------
    const ai = useAI({ userCode: persistence.userCode, userLang, roomId: roomId! });

    // ── Run code ──────────────────────────────────────────────────────────────
    const runCode = async () => {
        setIsRunning(true);
        try {
            const res = await axios.post(`${URL}/compile`, {
                code: persistence.userCode,
                userLangId,
                input: userInput,
            });
            await axios.post(`${URL}/snapshot/${roomId}`, {
                code: persistence.userCode,
                language: userLang,
            });
            persistence.bumpRefreshHistory();
            setUserOutput(res.data.output ?? "No Output");
        } catch {
            setUserOutput("Error: Invalid Code");
        }
        setIsRunning(false);
    };


    //-------Monaco--MOUNT----------------------------------------------
    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        setIsEditorReady(true);
        (window as any).monaco = monaco;
        registerMonacoThemes(monaco);
        monaco.editor.setTheme(getLanguageByValue(userLang).monacoTheme);
        // Emit cursor moves for collaboration
        editor.onDidChangeCursorPosition((e: any) => {
            emitCursorMove(e.position.lineNumber, e.position.column);
        });
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">

            <Navbar
                userLang={userLang}
                setUserLang={persistence.handleSetUserLang}
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

            {/* USER AVATARS  WITH COLORS*/}
            <UserPresenceBar users={users} />

            <div className="flex flex-1 min-h-0">

                {/*LEFT MONACO EDITOR */}
                <div className="w-2/3 p-1 mt-1 bg-gray-900 relative">
                    <Editor
                        height="100%"
                        language={getLanguageByValue(userLang).monacoLanguage}
                        theme={userTheme}
                        //value={typeof userCode === "string" ? userCode : ""}
                        defaultValue={persistence.userCode}
                        onMount={handleEditorMount}
                        onChange={(value) => {
                            // Skip if triggered by setValue during a language switch
                            // or by a remote collaborator's update — both are not user edits
                            if (persistence.isLanguageSwitching.current || isRemoteUpdate.current) {
                                isRemoteUpdate.current = false;
                                return;
                            }

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

                    {/* FLOATING SELECTION TOOL BAR */}
                    <SelectionToolbar
                        editorRef={editorRef}
                        onAsk={ai.askAboutSelection}
                        isEditorReady={isEditorReady}
                    />
                </div>

                {/* RIGHT PANEL */}
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
                    aiOutput={ai.aiOutput}
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