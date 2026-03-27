// src/hooks/useEditorPersistence.ts
// Owns everything related to saving/loading/restoring code from the DB.
// EditorPage just calls this hook and gets handlers back.

import { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash.debounce";
import axios from "axios";
import toast from "react-hot-toast";
import { socket } from "../socket";
import { getLanguageByValue } from "../languageOptions";

const URL = import.meta.env.VITE_BACKEND_URL;

interface UseEditorPersistenceProps {
    roomId: string;
    username: string;
    userLang: string;
    setUserLang: (lang: string) => void;
    editorRef: React.MutableRefObject<any>;
    isRemoteUpdate: React.MutableRefObject<boolean>;
}

export function useEditorPersistence({
    roomId,
    username,
    userLang,
    setUserLang,
    editorRef,
    isRemoteUpdate,
}: UseEditorPersistenceProps) {

    const [userCode, setUserCode] = useState(getLanguageByValue("javascript").starterCode);
    const [codeMap, setCodeMap] = useState<Record<string, string>>({});
    const [refreshHistory, setRefreshHistory] = useState(0);
    const isLanguageSwitching = useRef(false);
    const saveRef = useRef<ReturnType<typeof debounce<(code: string, lang: string) => void>> | null>(null);

    // ── Init debounced DB save ────────────────────────────────────────────────
    useEffect(() => {
        saveRef.current = debounce((code: string, language: string) => {
            axios.post(`${URL}/room/${roomId}/save`, { code, language });
        }, 2000);
        return () => saveRef.current?.cancel();
    }, [roomId]);

    // ── Load room code from DB on mount ───────────────────────────────────────
    useEffect(() => {
        if (!roomId) return;
        const load = async () => {
            try {
                const res = await axios.get(`${URL}/room/${roomId}`);
                const lang = res.data.language || "javascript";
                const code = res.data.code || getLanguageByValue(lang).starterCode;

                setUserLang(lang);
                setUserCode(code);
                setCodeMap({ [lang]: code });

                if (editorRef.current) {
                    isRemoteUpdate.current = true;
                    editorRef.current.setValue(code);
                }
            } catch (err) {
                console.error("Failed to load room:", err);
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
            navigator.sendBeacon(
                `${URL}/snapshot/${roomId}`,
                JSON.stringify({ code: userCode, language: userLang })
            );
        };
        window.addEventListener("beforeunload", handleBeforeLeave);
        return () => window.removeEventListener("beforeunload", handleBeforeLeave);
    }, [roomId, userCode, userLang]);

    // ── Language switch — saves current lang code, restores new lang code ─────
    const handleSetUserLang = async (newLang: string) => {
        if (newLang === userLang) return;

        const currentCode = editorRef.current?.getValue() || userCode;
        const updatedMap = { ...codeMap, [userLang]: currentCode };
        setCodeMap(updatedMap);

        const newCode = updatedMap[newLang] ?? getLanguageByValue(newLang).starterCode;

        isLanguageSwitching.current = true;
        setUserCode(newCode);
        setUserLang(newLang);
        editorRef.current?.setValue(newCode);
        isLanguageSwitching.current = false;

        socket.emit("content-edited", { code: newCode, language: newLang });

        try {
            await axios.post(`${URL}/room/${roomId}/save`, {
                code: newCode,
                language: newLang,
            });
        } catch (err) {
            console.error("Failed to save after lang switch:", err);
        }
    };

    // ── Save snapshot ─────────────────────────────────────────────────────────
    const handleSaveCode = async () => {
        try {
            await axios.post(`${URL}/snapshot/${roomId}`, {
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
        axios.post(`${URL}/room/${roomId}/save`, { code, language });
        setRefreshHistory(prev => prev + 1);
        toast.success("Snapshot restored");
    };

    // ── Clear editor ──────────────────────────────────────────────────────────
    const handleClearEditor = () => {
        isLanguageSwitching.current = true;
        setUserCode("");
        editorRef.current?.setValue("");
        isLanguageSwitching.current = false;

        socket.emit("content-edited", { code: "", language: userLang });
        axios.post(`${URL}/room/${roomId}/save`, { code: "", language: userLang });
    };

    // ── Download ──────────────────────────────────────────────────────────────
    const handleDownloadCode = () => {
        if (!userCode) { toast.error("No code to download"); return; }

        const ext: Record<string, string> = {
            javascript: "js", python: "py", cpp: "cpp", c: "c",
        };

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const filename = `${username}-${timestamp}.${ext[userLang] ?? "txt"}`;
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
        handleSetUserLang,
        handleSaveCode,
        handleRestoreSnapshot,
        handleClearEditor,
        handleDownloadCode,
        handleEditorChange,
    };
}