import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import toast from "react-hot-toast";
import type { editor } from "monaco-editor";
import type * as Monaco from "monaco-editor"

interface User {
    username: string;
    color: string;
    socketId: string;
}

interface CursorMovePayload {
    line: number;
    column: number;
    username: string;
    color: string;
    socketId: string;
}

interface UseCollaborationProps {
    roomId: string;
    username: string;
    editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
    monacoInstance: React.MutableRefObject<typeof Monaco | null>;
    onCodeChange: (code: string) => void;
    onLangChange: (lang: string) => void;  // replaces setUserLang — EditorPage handles Monaco
    isRemoteUpdate: React.MutableRefObject<boolean>;
}

export function useCollaboration({
    roomId,
    username,
    editorRef,
    monacoInstance,
    onCodeChange,
    onLangChange,
    isRemoteUpdate,
}: UseCollaborationProps) {
    const [users, setUsers] = useState<User[]>([]);
    const myColor = useRef<string>("#ffffff");
    const decorationsRef = useRef<Map<string, string[]>>(new Map());

    // ── JOIN ROOM ─────────────────────────────────────────────────────────────
    useEffect(() => {
        socket.connect();
        socket.emit("join", { RoomId: roomId, username });

        return () => {
            // Don't disconnect here — Navbar Leave button handles that
        };
    }, [roomId, username]);

    // ── SOCKET LISTENERS ──────────────────────────────────────────────────────
    useEffect(() => {

        // New user joined — send them the current code
        socket.on("code-sync", (code: string) => {
            if (code) onCodeChange(code);
        });

        socket.on("connect_error", () => {
            toast.error("Connection failed. Please check your network and try again.");
        });

        // A collaborator edited code
        socket.on("content-edited", ({ code, language }: { code: string, language: string }) => {
            if (code === undefined || code === null) return;
            
            if (language) {
                onLangChange(language);
            }

            onCodeChange(code);
        });

        // User list updated (join / leave)
        socket.on("users", (updatedUsers: User[]) => {
            const unique = [...new Map(updatedUsers.map(u => [u.socketId, u])).values()];
            setUsers(updatedUsers);

            const currentSocketIds = new Set(unique.map(u => u.socketId));

            // Clean up decorations for users who left
            decorationsRef.current.forEach((decs, socketId) => {
                if (!currentSocketIds.has(socketId)) {
                    editorRef.current?.deltaDecorations(decs, []);
                    decorationsRef.current.delete(socketId);
                    document.getElementById(`cursor-style-${socketId}`)?.remove();
                }
            });

            setUsers(unique);
            const me = unique.find(u => u.username === username);
            if (me) myColor.current = me.color;
        });

        // A collaborator moved their cursor
        socket.on("cursor-move", ({ line, column, username: remoteUser, color, socketId }: CursorMovePayload) => {

            if (!editorRef.current) return;

            const editor = editorRef.current;
            if (!editor.getModel()) return;

            const monaco = monacoInstance.current;
            if (!monaco) return;

            const newDecorations = [
                {

                    range: new monaco.Range(line, column, line, column + 1),
                    options: {
                        className: `cursor-decoration-${socketId}`,
                        beforeContentClassName: `cursor-label-${socketId}`,
                        stickiness: 1,
                        zIndex: 100,
                    },
                },
                {
                    range: new monaco.Range(line, 1, line, 1),
                    options: {
                        isWholeLine: true,
                        className: `line-highlight-${socketId}`,
                    },
                },
            ];

            const old = decorationsRef.current.get(socketId) ?? [];
            const updated = editor.deltaDecorations(old, newDecorations);
            decorationsRef.current.set(socketId, updated);
            
            injectCursorStyle(socketId, color, remoteUser);
        });

        return () => {
            socket.off("code-sync");
            socket.off("content-edited");
            socket.off("users");
            socket.off("cursor-move");
            socket.off("connect_error");
        };
    }, [username, onCodeChange, onLangChange]);

    // ── CURSOR STYLE INJECTION ────────────────────────────────────────────────
    const injectCursorStyle = (socketId: string, color: string, name: string) => {
        const styleId = `cursor-style-${socketId}`;
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .cursor-decoration-${socketId} {
                border-left: 2px solid ${color};
                margin-left: -1px;
                position: relative;
            }
            .cursor-label-${socketId}::before {
                content: "${name}";
                background: ${color};
                color: #000;
                font-size: 10px;
                font-weight: 700;
                padding: 1px 5px;
                border-radius: 3px 3px 3px 0;
                position: absolute;
                bottom: 100%;
                left: 1px;
                margin-bottom: 2px;
                white-space: nowrap;
                pointer-events: none;
                z-index: 10000;
                line-height: 1.6;
                letter-spacing: 0.02em;
            }
            .line-highlight-${socketId} {
                background: ${color}18;
                border-left: 3px solid ${color};
            }
        `;
        document.head.appendChild(style);
    };

    // ── EMITTERS ──────────────────────────────────────────────────────────────
    const emitCursorMove = (line: number, column: number) => {
        socket.emit("cursor-move", {
            line,
            column,
            username,
            color: myColor.current,
        });
    };

    const emitCodeChange = ({ code, language }: { code: string; language: string }) => {
        // Never re-emit what we just received from a remote update
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        socket.emit("content-edited", { code, language });
    };

    return { users, decorationsRef, emitCursorMove, emitCodeChange };
}