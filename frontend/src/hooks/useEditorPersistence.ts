import { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash.debounce";
import api from "../lib/authAxios";
import toast from "react-hot-toast";
import { socket } from "../socket";
import { getLanguageByValue } from "../languageOptions";
import { editor } from "monaco-editor";
import { getUserFromToken } from "../utils/auth";

interface UseEditorPersistenceProps {
    roomId: string;
    userLang: string;
    setUserLang: (lang: string) => void;
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
    isRemoteUpdate: React.MutableRefObject<boolean>;
    onLoad?: (code: string, lang: string) => void; // EditorPage applies imperatively
}

const URL = import.meta.env.VITE_BACKEND_URL;

export function useEditorPersistence({
    roomId,
    userLang,
    setUserLang,
    editorRef,
    isRemoteUpdate,
    onLoad,
}: UseEditorPersistenceProps) {

    const [userCode, setUserCode] = useState(getLanguageByValue("javascript").starterCode);
    const [codeMap, setCodeMap] = useState<Record<string, string>>({});
    const [refreshHistory, setRefreshHistory] = useState(0);
    const isLanguageSwitching = useRef(false);
    const saveRef = useRef<ReturnType<typeof debounce<(code: string, lang: string) => void>> | null>(null);

    const user = getUserFromToken();
    const name = user?.username?.charAt(0).toUpperCase() + user?.username?.slice(1);

    // ── Init debounced DB save ────────────────────────────────────────────────
    useEffect(() => {
        saveRef.current = debounce((code: string, language: string) => {
            api.post(`/room/${roomId}/save`, { code, language });
        }, 2000);
        return () => saveRef.current?.cancel();
    }, [roomId]);

    // ── Load room code from DB on mount ───────────────────────────────────────
    useEffect(() => {
        if (!roomId) return;
        const load = async () => {
            try {
                const res = await api.get(`/room/${roomId}`);
                const lang = res.data.language || "javascript";
                const code = res.data.code || getLanguageByValue(lang).starterCode;

                // Update React state for AI prompts, badge, etc.
                setUserCode(code);
                setCodeMap({ [lang]: code });

                // Let EditorPage apply to Monaco imperatively (avoids race)
                if (onLoad) {
                    onLoad(code, lang);
                } else {
                    // fallback if onLoad not provided
                    setUserLang(lang);
                    if (editorRef.current) {
                        isRemoteUpdate.current = true;
                        editorRef.current.setValue(code);
                    }
                }
            } catch {
                toast.error("Failed to load room data");
            }
        };
        load();
    }, [roomId]);

    // ── Ctrl+S ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                handleSaveCode();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [userCode, userLang]);

    // ── beforeunload beacon ───────────────────────────────────────────────────
    useEffect(() => {
        const handleBeforeLeave = () => {
            
            navigator.sendBeacon(`${URL}/snapshot/${roomId}`,
                new Blob([JSON.stringify({ code: userCode, language: userLang })], 
                        { type: "application/json" })
            );

        };
        window.addEventListener("beforeunload", handleBeforeLeave);
        return () => window.removeEventListener("beforeunload", handleBeforeLeave);
    }, [roomId, userCode, userLang]);

    // ── Save snapshot ─────────────────────────────────────────────────────────
    const handleSaveCode = async () => {

        if (!userCode) { toast("No Code to Save", { icon: "ℹ️" }); return; }

        try {
            await api.post(`/snapshot/${roomId}`, {
                code: userCode,
                language: userLang,
            });
            toast.success("Code saved");
            setRefreshHistory(prev => prev + 1);
        } catch {
            toast.error("Failed to save code");
        }
    };

    // ── Restore snapshot ──────────────────────────────────────────────────────
    const handleRestoreSnapshot = (snapshot: { code: string; language: string }) => {
        const { code, language } = snapshot;

        isLanguageSwitching.current = true;
        setUserCode(code);
        setUserLang(language);
        editorRef.current?.setValue(code);
        isLanguageSwitching.current = false;

        socket.emit("content-edited", { code, language });
        api.post(`/room/${roomId}/save`, { code, language });
        setRefreshHistory(prev => prev + 1);
        toast.success("Snapshot restored");
    };

    // ── Clear editor ──────────────────────────────────────────────────────────
    const handleClearEditor = async () => {
        const currentCode = editorRef.current?.getValue() || userCode;

        if (!currentCode || currentCode.trim() === "") {
            toast("Nothing to clear", { icon: "ℹ️" });
            return;
        }

        isLanguageSwitching.current = true;

        setUserCode("");
        editorRef.current?.setValue("");

        isLanguageSwitching.current = false;

        socket.emit("content-edited", { code: "", language: userLang });

        try {
            await api.post(`/room/${roomId}/save`, {
                code: "",
                language: userLang,
            });
            toast.success("Editor cleared");
        } catch {
            toast.error("Failed to clear editor");
        }
    };

    // ── Download ──────────────────────────────────────────────────────────────
    const handleDownloadCode = () => {
        if (!userCode) { toast("No Code to Download", { icon: "ℹ️" }); return; }

        const ext: Record<string, string> = {
            javascript: "js", python: "py", cpp: "cpp", c: "c",
        };

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const filename = `${name}-${timestamp}.${ext[userLang] ?? "txt"}`;
        //const filename = `${timestamp}.${ext[userLang] ?? "txt"}`;
        const blob = new Blob([userCode], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Downloaded ${filename}`);
    };

    // ── onChange handler (called from Editor's onChange prop) ─────────────────
    const handleEditorChange = useCallback((value: string, lang: string) => {
        setUserCode(value);
        setCodeMap(prev => ({ ...prev, [lang]: value }));
        saveRef.current?.(value, lang);
    }, []);

    return {
        userCode,
        setUserCode,
        codeMap,
        setCodeMap,
        refreshHistory,
        bumpRefreshHistory: () => setRefreshHistory(prev => prev + 1),
        isLanguageSwitching,
        handleSaveCode,
        handleRestoreSnapshot,
        handleClearEditor,
        handleDownloadCode,
        handleEditorChange,
    };
}