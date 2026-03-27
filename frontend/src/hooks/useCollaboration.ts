import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";

interface User {
    username: string;
    color: string;
    socketId: string;
}

interface UseCollaborationProps {
    roomId: string;
    username: string;
    onCodeChange: (code: string) => void;
    setUserLang: (lang: string) => void;
    isRemoteUpdate: React.MutableRefObject<boolean>;
}

export function useCollaboration({ roomId, username, onCodeChange, setUserLang, isRemoteUpdate }: UseCollaborationProps) {
    const [users, setUsers] = useState<User[]>([]);
    const myColor = useRef<string>("#ffffff");
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<Map<string, any[]>>(new Map());

    // JOIN ROOM
    useEffect(() => {
        socket.emit("join", { RoomId: roomId, username });
    }, [roomId, username]);

    // SOCKET LISTENERS
    useEffect(() => {
        socket.on("code-sync", (code: string) => {
            if (code) onCodeChange(code);
        });

        socket.on("connect_error", (err) => {
            console.log("socket connection failed", err.message);
        })

        socket.on("content-edited", ({ code, language }: { code: string, language: string }) => {
            // Change this:
            // if (!code || code.trim() === "") return; 

            // To this:
            if (code === undefined || code === null) return;

            isRemoteUpdate.current = true;
            onCodeChange(code); // Pass language if your backend sends it
        });

        socket.on("users", (updatedUsers: User[]) => {

            const currentSocketIds = new Set(updatedUsers.map(u => u.socketId));

            decorationsRef.current.forEach((decs, socketId) => {
                if (!currentSocketIds.has(socketId)) {

                    // Remove their decorations from editor
                    if (editorRef.current) {
                        editorRef.current.deltaDecorations(decs, []);
                    }
                    decorationsRef.current.delete(socketId);

                    document.getElementById(`cursor-style-${socketId}`)?.remove();
                }
            });

            setUsers(updatedUsers);
            const me = updatedUsers.find((u) => u.username === username);
            if (me) myColor.current = me.color;
        });

        socket.on("cursor-move", ({ line, column, username: remoteUser, color, socketId }: any) => {
            if (!editorRef.current) return;
            const editor = editorRef.current;
            if (!editor.getModel()) return;

            const newDecorations = [
                {
                    range: new (window as any).monaco.Range(line, column, line, column + 1),
                    options: {
                        className: `cursor-decoration-${socketId}`,
                        beforeContentClassName: `cursor-label-${socketId}`,
                        stickiness: 1,
                        zIndex: 100,
                    },
                },
                {
                    range: new (window as any).monaco.Range(line, 1, line, 1),
                    options: {
                        isWholeLine: true,
                        className: `line-highlight-${socketId}`,
                    },
                },
            ];

            const oldDecorations = decorationsRef.current.get(socketId) || [];

            const updated = editor.deltaDecorations(oldDecorations, newDecorations);

            decorationsRef.current.set(socketId, updated);

            injectCursorStyle(socketId, color, remoteUser);
        });

        return () => {
            socket.off("code-sync");
            socket.off("content-edited");
            socket.off("users");
            socket.off("cursor-move");
        };
    }, [username, onCodeChange]);

    const injectCursorStyle = (socketId: string, color: string, name: string) => {
        const styleId = `cursor-style-${socketId}`;
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
            .cursor-decoration-${socketId} {
                border-left: 2px solid ${color};
                margin-left: -1px;
                position:relative;
            }
            .cursor-label-${socketId}::before {
                content: "${name}";
                background: ${color};
                color: #000;
                font-size: 10px;
                font-weight: 700;
                padding: 1px 5px;
                border-radius: 3px 3px 3px 0px;
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

    const emitCursorMove = (line: number, column: number) => {
        socket.emit("cursor-move", {
            line,
            column,
            username,
            color: myColor.current,
        });
    };

    const emitCodeChange = ({ code, language }: { code: string, language: string }) => {
        if (isRemoteUpdate.current) {
            isRemoteUpdate.current = false;
            return;
        }
        socket.emit("content-edited", { code, language });
    };

    return { users, editorRef, decorationsRef, emitCursorMove, emitCodeChange };
}