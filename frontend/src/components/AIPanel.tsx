// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
// import { FiCopy } from "react-icons/fi";
// import { IoSend } from "react-icons/io5";
// import { AiOutlineClear } from "react-icons/ai";
// import { useState, useRef, useCallback } from "react";
// import toast from "react-hot-toast";
// import api from "../lib/authAxios";

// import geminiLogo from "../assets/geminiLogo.png";
// import type { Components } from "react-markdown";

// interface AIMessage {
//     role: "user" | "ai";
//     content: string;
// }

// interface CodeProps {
//     inline?: boolean;
//     className?: string;
//     children?: React.ReactNode;
// }

// interface AIPanelProps {
//     roomId: string;
//     mode: "code" | "selection" | "question";
//     history: AIMessage[];
//     setHistory: (v: AIMessage[]) => void;
//     isAiThinking: boolean;
//     rateCooldown: number;
//     aiQuestion: string;
//     setAiQuestion: (v: string) => void;
//     onAskQuestion: (q: string) => void;
//     isRunning: boolean;
//     userOutput: string;
//     aiOutputRef: React.RefObject<HTMLDivElement | null>;
//     bottomRef: React.RefObject<HTMLDivElement | null>;
// }

// export default function AIPanel({
//     roomId,
//     mode, history, setHistory,
//     isAiThinking, rateCooldown,
//     aiQuestion, setAiQuestion, onAskQuestion,
//     isRunning, userOutput,
//     aiOutputRef, bottomRef,
// }: AIPanelProps) {

//     // ── Resizable AI output panel ─────────────────────────────────────────────
//     // Min 120px, no max (user decides). Default 340px feels like a real editor.
//     const AI_MIN_HEIGHT = 120;
//     const AI_DEFAULT_HEIGHT = 340;
//     const [aiPanelHeight, setAiPanelHeight] = useState(AI_DEFAULT_HEIGHT);
//     const dragStartY = useRef<number>(0);
//     const dragStartHeight = useRef<number>(AI_DEFAULT_HEIGHT);
//     const isDragging = useRef<boolean>(false);

//     const onDragStart = useCallback((e: React.MouseEvent) => {
//         e.preventDefault();
//         isDragging.current = true;
//         dragStartY.current = e.clientY;
//         dragStartHeight.current = aiPanelHeight;
 
//         const onMouseMove = (ev: MouseEvent) => {
//             if (!isDragging.current) return;
//             // Dragging UP (negative delta) = growing the panel
//             const delta = dragStartY.current - ev.clientY;
//             const newHeight = Math.max(AI_MIN_HEIGHT, dragStartHeight.current + delta);
//             setAiPanelHeight(newHeight);
//         };
 
//         const onMouseUp = () => {
//             isDragging.current = false;
//             document.removeEventListener("mousemove", onMouseMove);
//             document.removeEventListener("mouseup", onMouseUp);
//             document.body.style.cursor = "";
//             document.body.style.userSelect = "";
//         };
 
//         document.addEventListener("mousemove", onMouseMove);
//         document.addEventListener("mouseup", onMouseUp);
//         document.body.style.cursor = "ns-resize";
//         document.body.style.userSelect = "none";
//     }, [aiPanelHeight]);

//     const copyToClipboard = (text: string) => {
//         navigator.clipboard.writeText(text);
//         toast.success("Copied!");
//     };

//     const handleClearChat = async () => {
//         if (history.length === 0) {
//             toast("Chat is already empty", { icon: "ℹ️" });
//             return;
//         } 
//         try {
//             await api.delete(`/ai/history/${roomId}`);
//             setHistory([]);
//             toast.success("Chat cleared");
//         } catch {
//             toast.error("Failed to clear chat");
//         }
//     };

//     const markdownComponents: Components = {
//             h2: ({ children }) => (
//                 <h2 className="text-sm font-bold text-blue-400 mt-4 mb-2 border-b border-white/8 pb-1 first:mt-0">
//                     {children}
//                 </h2>
//                 ),
//             h3: ({ children }) => (
//                 <h3 className="text-xs font-semibold text-blue-300 mt-3 mb-1">
//                     {children}
//                 </h3>
//                 ),
//             p: ({ children }) => (
//                 <p className="text-sm text-gray-300 mb-2 leading-relaxed">
//                     {children}
//                 </p>
//              ),
//             ul: ({ children }) => (
//                 <ul className="text-sm text-gray-300 mb-2 space-y-1 pl-1">
//                     {children}
//                 </ul>
//                 ),
//             li: ({ children }) => (
//                 <li className="flex gap-2">
//                     <span className="text-white/25 mt-1 shrink-0 text-xs">–</span>
//                     <span className="leading-relaxed">{children}</span>
//                     </li>
//                 ),
//             code({ inline, className, children }: CodeProps) {
//                 const match = /language-(\w+)/.exec(className || "");
//                 const codeText = String(children).replace(/\n$/, "");
//                     return !inline && match ? (
//                         <div className="relative my-3 rounded-lg overflow-hidden border border-white/8">
//                             <div className="flex items-center justify-between bg-white/4 border-b border-white/6 px-3 py-1.5">
//                             <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
//                                 {match[1]}
//                             </span>
//                             <button
//                                 onClick={() => copyToClipboard(codeText)}
//                                 className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
//                             >
//                                 <FiCopy size={11} /> Copy
//                             </button>
//                             </div>
//                             <SyntaxHighlighter
//                                 style={oneDark}
//                                 language={match[1]}
//                                 customStyle={{ margin: 0, borderRadius: 0, padding: "0.875rem", fontSize: "0.78rem", background: "#080d12" }}
//                             >
//                                 {codeText}
//                             </SyntaxHighlighter>
//                         </div>
//                         ) : (
//                             <code className="bg-white/8 text-yellow-300/80 px-1.5 py-0.5 rounded text-xs font-mono border border-white/8">
//                                 {children}
//                             </code>
//                         );
//                     },
//                 };

//     return (
//         <>
//             {/* QUESTION INPUT */}
//             <div className="relative w-full">
//                 <textarea
//                     value={aiQuestion}
//                     onChange={(e) => setAiQuestion(e.target.value)}
//                     onKeyDown={(e) => {
//                         if (e.key === "Enter" && !e.shiftKey) {
//                             e.preventDefault();
//                             if (aiQuestion.trim()) onAskQuestion(aiQuestion);
//                         }
//                     }}
//                     placeholder="Ask anything… (Enter to send)"
//                     rows={2}
//                     disabled={isAiThinking || rateCooldown > 0}
//                     className="w-full resize-none bg-gray-800 border border-white/8
//                                text-sm text-white/80 placeholder:text-white/25
//                                rounded-lg px-3 pr-10 py-2 outline-none
//                                focus:border-white/20 transition-colors
//                                disabled:opacity-40 disabled:cursor-not-allowed"
//                 />
//                 <button
//                     onClick={() => { if (aiQuestion.trim()) onAskQuestion(aiQuestion); }}
//                     disabled={isAiThinking || !aiQuestion.trim() || rateCooldown > 0}
//                     className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-md
//                                bg-white text-gray-900
//                                hover:bg-yellow-500 active:scale-95
//                                transition-all duration-150 mb-3 mr-2 disabled:opacity-25 cursor-pointer
//                                disabled:cursor-not-allowed"
//                 >
//                     <IoSend size={14} />
//                 </button>
//             </div>

//             {/* EXECUTION OUTPUT */}
//             <div className="bg-black/60 border border-white/6 rounded-lg
//                             px-3 py-2.5 h-24 overflow-auto text-sm
//                             font-mono text-white/70 leading-relaxed shrink-0">
//                 {isRunning ? (
//                     <span className="text-white/30 animate-pulse">Running…</span>
//                 ) : userOutput ? (
//                     <pre className="whitespace-pre-wrap">{userOutput}</pre>
//                 ) : (
//                     <span className="text-white/20">Output</span>
//                 )}
//             </div>

//             {/* DRAG HANDLE — sits between output box and AI panel */}
//             <div
//                 onMouseDown={onDragStart}
//                 className="group flex items-center justify-center h-2 cursor-ns-resize
//                            rounded-full mx-1 hover:bg-white/8 transition-colors shrink-0"
//                 title="Drag to resize AI panel"
//             >
//                 {/* Visual grip dots */}
//                 <div className="flex gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
//                     {[0, 1, 2].map((i) => (
//                         <span key={i} className="w-1 h-1 rounded-full bg-white/60" />
//                     ))}
//                 </div>
//             </div>

//             {/* AI CHAT OUTPUT */}
//             <div
//                 ref={aiOutputRef}
//                 className="flex-1 bg-gray-800/60 border border-white/8 rounded-xl
//                            overflow-auto min-h-0 relative shrink-0"
//                 style={{height: aiPanelHeight}}
//             >
//                 {/* Sticky header */}
//                 <div className="sticky top-0 flex items-center justify-between px-3 py-2
//                                 bg-gray-900 border-b border-white/6 z-10">
//                     <div className="flex items-center gap-2">
//                         <img src={geminiLogo} className="w-3.5 h-3.5" />
//                         <span className="text-xs text-white/40 font-medium">Gemini</span>
//                         {isAiThinking && (
//                             <div className="flex gap-1 ml-2">
//                                 {[0, 150, 300].map((d) => (
//                                     <span key={d}
//                                         className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
//                                         style={{ animationDelay: `${d}ms` }}
//                                     />
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                     <button
//                         onClick={handleClearChat}
//                         className="flex items-center gap-1.5 hover:bg-red-500/20 text-red-500
//                                    border border-red-500/40 bg-transparent font-semibold
//                                    px-2 py-0.5 rounded-md cursor-pointer transition-colors text-xs"
//                     >
//                         <AiOutlineClear size={14} /> Clear
//                     </button>
//                 </div>

//                 <div className="p-3">
//                     {/* Mode indicator while thinking */}
//                     {isAiThinking && (
//                         <div className="text-xs mb-2 font-medium">
//                             {mode === "selection" && <span className="text-purple-400">✂️ Analyzing selected code…</span>}
//                             {mode === "code" && <span className="text-blue-400">🧠 Reviewing full code…</span>}
//                             {mode === "question" && <span className="text-green-400">💬 Answering your question…</span>}
//                         </div>
//                     )}

//                     {/* Empty state */}
//                     {history.length === 0 && !isAiThinking ? (
//                         <div className="flex flex-col items-center justify-center py-8 gap-2">
//                             <img src={geminiLogo} className="w-8 h-8 opacity-20" />
//                             <p className="text-xs text-white/25 text-center">
//                                 Click Ask Gemini or type a question above
//                             </p>
//                         </div>
//                     ) : (
//                         history.map((msg, i) => (
//                             <div key={i} className="border-b border-white/5 pb-3 mb-1">
//                                 <div className="text-xs text-white/40 mb-1">
//                                     {msg.role === "user" ? "You" : "Gemini"}
//                                 </div>
//                                 <ReactMarkdown
//                                     remarkPlugins={[remarkGfm]}
//                                     components={markdownComponents} 
//                                 >
//                                     {msg.content}
//                                 </ReactMarkdown>
//                             </div>
//                         ))
//                     )}
//                     <div ref={bottomRef} />
//                 </div>
//             </div>
//         </>
//     );
// }

// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
// import { FiCopy } from "react-icons/fi";
// import { IoSend } from "react-icons/io5";
// import { AiOutlineClear } from "react-icons/ai";
// import { useRef, useState, useCallback } from "react";
// import toast from "react-hot-toast";
// import api from "../lib/authAxios";

// import geminiLogo from "../assets/geminiLogo.png";
// import type { Components } from "react-markdown";

// interface AIMessage {
//     role: "user" | "ai";
//     content: string;
// }

// interface CodeProps {
//     inline?: boolean;
//     className?: string;
//     children?: React.ReactNode;
// }

// interface AIPanelProps {
//     roomId: string;
//     mode: "code" | "selection" | "question";
//     history: AIMessage[];
//     setHistory: (v: AIMessage[]) => void;
//     isAiThinking: boolean;
//     rateCooldown: number;
//     aiQuestion: string;
//     setAiQuestion: (v: string) => void;
//     onAskQuestion: (q: string) => void;
//     isRunning: boolean;
//     userOutput: string;
//     aiOutputRef: React.RefObject<HTMLDivElement | null>;
//     bottomRef: React.RefObject<HTMLDivElement | null>;
// }

// export default function AIPanel({
//     roomId,
//     mode, history, setHistory,
//     isAiThinking, rateCooldown,
//     aiQuestion, setAiQuestion, onAskQuestion,
//     isRunning, userOutput,
//     aiOutputRef, bottomRef,
// }: AIPanelProps) {

//     // ── Resizable AI output panel ─────────────────────────────────────────────
//     // Min 120px, no max (user decides). Default 340px feels like a real editor.
//     const AI_MIN_HEIGHT = 120;
//     const AI_DEFAULT_HEIGHT = 340;
//     const [aiPanelHeight, setAiPanelHeight] = useState(AI_DEFAULT_HEIGHT);
//     const dragStartY = useRef<number>(0);
//     const dragStartHeight = useRef<number>(AI_DEFAULT_HEIGHT);
//     const isDragging = useRef<boolean>(false);

//     const onDragStart = useCallback((e: React.MouseEvent) => {
//         e.preventDefault();
//         isDragging.current = true;
//         dragStartY.current = e.clientY;
//         dragStartHeight.current = aiPanelHeight;

//         const onMouseMove = (ev: MouseEvent) => {
//             if (!isDragging.current) return;
//             // Dragging UP (negative delta) = growing the panel
//             const delta = dragStartY.current - ev.clientY;
//             const newHeight = Math.max(AI_MIN_HEIGHT, dragStartHeight.current + delta);
//             setAiPanelHeight(newHeight);
//         };

//         const onMouseUp = () => {
//             isDragging.current = false;
//             document.removeEventListener("mousemove", onMouseMove);
//             document.removeEventListener("mouseup", onMouseUp);
//             document.body.style.cursor = "";
//             document.body.style.userSelect = "";
//         };

//         document.addEventListener("mousemove", onMouseMove);
//         document.addEventListener("mouseup", onMouseUp);
//         document.body.style.cursor = "ns-resize";
//         document.body.style.userSelect = "none";
//     }, [aiPanelHeight]);

//     const copyToClipboard = (text: string) => {
//         navigator.clipboard.writeText(text);
//         toast.success("Copied!");
//     };

//     const handleClearChat = async () => {
//         if (history.length === 0) {
//             toast("Chat is already empty", { icon: "ℹ️" });
//             return;
//         } 
//         try {
//             await api.delete(`/ai/history/${roomId}`);
//             setHistory([]);
//             toast.success("Chat cleared");
//         } catch {
//             toast.error("Failed to clear chat");
//         }
//     };

//     const markdownComponents: Components = {
//             h2: ({ children }) => (
//                 <h2 className="text-sm font-bold text-blue-400 mt-4 mb-2 border-b border-white/8 pb-1 first:mt-0">
//                     {children}
//                 </h2>
//                 ),
//             h3: ({ children }) => (
//                 <h3 className="text-xs font-semibold text-blue-300 mt-3 mb-1">
//                     {children}
//                 </h3>
//                 ),
//             p: ({ children }) => (
//                 <p className="text-sm text-gray-300 mb-2 leading-relaxed">
//                     {children}
//                 </p>
//              ),
//             ul: ({ children }) => (
//                 <ul className="text-sm text-gray-300 mb-2 space-y-1 pl-1">
//                     {children}
//                 </ul>
//                 ),
//             li: ({ children }) => (
//                 <li className="flex gap-2">
//                     <span className="text-white/25 mt-1 shrink-0 text-xs">–</span>
//                     <span className="leading-relaxed">{children}</span>
//                     </li>
//                 ),
//             code({ inline, className, children }: CodeProps) {
//                 const match = /language-(\w+)/.exec(className || "");
//                 const codeText = String(children).replace(/\n$/, "");
//                     return !inline && match ? (
//                         <div className="relative my-3 rounded-lg overflow-hidden border border-white/8">
//                             <div className="flex items-center justify-between bg-white/4 border-b border-white/6 px-3 py-1.5">
//                             <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
//                                 {match[1]}
//                             </span>
//                             <button
//                                 onClick={() => copyToClipboard(codeText)}
//                                 className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
//                             >
//                                 <FiCopy size={11} /> Copy
//                             </button>
//                             </div>
//                             <SyntaxHighlighter
//                                 style={oneDark}
//                                 language={match[1]}
//                                 customStyle={{ margin: 0, borderRadius: 0, padding: "0.875rem", fontSize: "0.78rem", background: "#080d12" }}
//                             >
//                                 {codeText}
//                             </SyntaxHighlighter>
//                         </div>
//                         ) : (
//                             <code className="bg-white/8 text-yellow-300/80 px-1.5 py-0.5 rounded text-xs font-mono border border-white/8">
//                                 {children}
//                             </code>
//                         );
//                     },
//                 };

//     return (
//         <>
//             {/* QUESTION INPUT */}
//             <div className="relative w-full">
//                 <textarea
//                     value={aiQuestion}
//                     onChange={(e) => setAiQuestion(e.target.value)}
//                     onKeyDown={(e) => {
//                         if (e.key === "Enter" && !e.shiftKey) {
//                             e.preventDefault();
//                             if (aiQuestion.trim()) onAskQuestion(aiQuestion);
//                         }
//                     }}
//                     placeholder="Ask anything… (Enter to send)"
//                     rows={2}
//                     disabled={isAiThinking || rateCooldown > 0}
//                     className="w-full resize-none bg-gray-800 border border-white/8
//                                text-sm text-white/80 placeholder:text-white/25
//                                rounded-lg px-3 pr-10 py-2 outline-none
//                                focus:border-white/20 transition-colors
//                                disabled:opacity-40 disabled:cursor-not-allowed"
//                 />
//                 <button
//                     onClick={() => { if (aiQuestion.trim()) onAskQuestion(aiQuestion); }}
//                     disabled={isAiThinking || !aiQuestion.trim() || rateCooldown > 0}
//                     className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-md
//                                bg-white text-gray-900
//                                hover:bg-yellow-500 active:scale-95
//                                transition-all duration-150 mb-3 mr-2 disabled:opacity-25 cursor-pointer
//                                disabled:cursor-not-allowed"
//                 >
//                     <IoSend size={14} />
//                 </button>
//             </div>

//             {/* EXECUTION OUTPUT */}
//             <div className="bg-black/60 border border-white/6 rounded-lg
//                             px-3 py-2.5 h-24 overflow-auto text-sm
//                             font-mono text-white/70 leading-relaxed shrink-0">
//                 {isRunning ? (
//                     <span className="text-white/30 animate-pulse">Running…</span>
//                 ) : userOutput ? (
//                     <pre className="whitespace-pre-wrap">{userOutput}</pre>
//                 ) : (
//                     <span className="text-white/20">Output</span>
//                 )}
//             </div>

//             {/* DRAG HANDLE — sits between output box and AI panel */}
//             <div
//                 onMouseDown={onDragStart}
//                 className="group flex items-center justify-center h-2 cursor-ns-resize
//                            rounded-full mx-1 hover:bg-white/8 transition-colors shrink-0"
//                 title="Drag to resize AI panel"
//             >
//                 {/* Visual grip dots */}
//                 <div className="flex gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
//                     {[0, 1, 2].map((i) => (
//                         <span key={i} className="w-1 h-1 rounded-full bg-white/60" />
//                     ))}
//                 </div>
//             </div>

//             {/* AI CHAT OUTPUT — resizable */}
//             <div
//                 ref={aiOutputRef}
//                 className="bg-gray-800/60 border border-white/8 rounded-xl
//                            overflow-auto relative shrink-0"
//                 style={{ height: aiPanelHeight }}
//             >
//                 {/* Sticky header */}
//                 <div className="sticky top-0 flex items-center justify-between px-3 py-2
//                                 bg-gray-900 border-b border-white/6 z-10">
//                     <div className="flex items-center gap-2">
//                         <img src={geminiLogo} className="w-3.5 h-3.5" />
//                         <span className="text-xs text-white/40 font-medium">Gemini</span>
//                         {isAiThinking && (
//                             <div className="flex gap-1 ml-2">
//                                 {[0, 150, 300].map((d) => (
//                                     <span key={d}
//                                         className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
//                                         style={{ animationDelay: `${d}ms` }}
//                                     />
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                     <button
//                         onClick={handleClearChat}
//                         className="flex items-center gap-1.5 hover:bg-red-500/20 text-red-500
//                                    border border-red-500/40 bg-transparent font-semibold
//                                    px-2 py-0.5 rounded-md cursor-pointer transition-colors text-xs"
//                     >
//                         <AiOutlineClear size={14} /> Clear
//                     </button>
//                 </div>

//                 <div className="p-3">
//                     {/* Mode indicator while thinking */}
//                     {isAiThinking && (
//                         <div className="text-xs mb-2 font-medium">
//                             {mode === "selection" && <span className="text-purple-400">✂️ Analyzing selected code…</span>}
//                             {mode === "code" && <span className="text-blue-400">🧠 Reviewing full code…</span>}
//                             {mode === "question" && <span className="text-green-400">💬 Answering your question…</span>}
//                         </div>
//                     )}

//                     {/* Empty state */}
//                     {history.length === 0 && !isAiThinking ? (
//                         <div className="flex flex-col items-center justify-center py-8 gap-2">
//                             <img src={geminiLogo} className="w-8 h-8 opacity-20" />
//                             <p className="text-xs text-white/25 text-center">
//                                 Click Ask Gemini or type a question above
//                             </p>
//                         </div>
//                     ) : (
//                         history.map((msg, i) => (
//                             <div key={i} className="border-b border-white/5 pb-3 mb-1">
//                                 <div className="text-xs text-white/40 mb-1">
//                                     {msg.role === "user" ? "You" : "Gemini"}
//                                 </div>
//                                 <ReactMarkdown
//                                     remarkPlugins={[remarkGfm]}
//                                     components={markdownComponents} 
//                                 >
//                                     {msg.content}
//                                 </ReactMarkdown>
//                             </div>
//                         ))
//                     )}
//                     <div ref={bottomRef} />
//                 </div>
//             </div>
//         </>
//     );
// }

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy } from "react-icons/fi";
import { IoSend } from "react-icons/io5";
import { AiOutlineClear } from "react-icons/ai";
import { useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import api from "../lib/authAxios";

import geminiLogo from "../assets/geminiLogo.png";
import type { Components } from "react-markdown";

interface AIMessage {
    role: "user" | "ai";
    content: string;
}

interface CodeProps {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

interface AIPanelProps {
    roomId: string;
    mode: "code" | "selection" | "question";
    history: AIMessage[];
    setHistory: (v: AIMessage[]) => void;
    isAiThinking: boolean;
    rateCooldown: number;
    aiQuestion: string;
    setAiQuestion: (v: string) => void;
    onAskQuestion: (q: string) => void;
    isRunning: boolean;
    userOutput: string;
    aiOutputRef: React.RefObject<HTMLDivElement | null>;
    bottomRef: React.RefObject<HTMLDivElement | null>;
}

export default function AIPanel({
    roomId,
    mode, history, setHistory,
    isAiThinking, rateCooldown,
    aiQuestion, setAiQuestion, onAskQuestion,
    isRunning, userOutput,
    aiOutputRef, bottomRef,
}: AIPanelProps) {

    // ── Resizable AI output panel ─────────────────────────────────────────────
    const AI_MIN_HEIGHT = 120;
    const AI_DEFAULT_HEIGHT = 340;
    const [aiPanelHeight, setAiPanelHeight] = useState(AI_DEFAULT_HEIGHT);
    const aiPanelHeightRef = useRef(AI_DEFAULT_HEIGHT); // always current, no stale closure
    const dragStartY = useRef<number>(0);

    // Keep ref in sync with state so onDragStart never reads stale height
    const handleHeightChange = (h: number) => {
        aiPanelHeightRef.current = h;
        setAiPanelHeight(h);
    };

    // Auto-grow when new messages arrive (up to 500px max, then scroll)
    const prevHistoryLen = useRef(history.length);
    if (history.length !== prevHistoryLen.current) {
        prevHistoryLen.current = history.length;
        if (aiPanelHeightRef.current < 500) {
            const grown = Math.min(500, aiPanelHeightRef.current + 60);
            handleHeightChange(grown);
        }
    }

    const onDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartY.current = e.clientY;
        const startHeight = aiPanelHeightRef.current; // read from ref — never stale

        const onMouseMove = (ev: MouseEvent) => {
            const delta = dragStartY.current - ev.clientY;
            const newHeight = Math.max(AI_MIN_HEIGHT, startHeight + delta);
            handleHeightChange(newHeight);
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";
    }, []); // stable — reads height from ref, not closure

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied!");
    };

    const handleClearChat = async () => {
        if (history.length === 0) {
            toast("Chat is already empty", { icon: "ℹ️" });
            return;
        } 
        try {
            await api.delete(`/ai/history/${roomId}`);
            setHistory([]);
            toast.success("Chat cleared");
        } catch {
            toast.error("Failed to clear chat");
        }
    };

    const markdownComponents: Components = {
            h2: ({ children }) => (
                <h2 className="text-sm font-bold text-blue-400 mt-4 mb-2 border-b border-white/8 pb-1 first:mt-0">
                    {children}
                </h2>
                ),
            h3: ({ children }) => (
                <h3 className="text-xs font-semibold text-blue-300 mt-3 mb-1">
                    {children}
                </h3>
                ),
            p: ({ children }) => (
                <p className="text-sm text-gray-300 mb-2 leading-relaxed">
                    {children}
                </p>
             ),
            ul: ({ children }) => (
                <ul className="text-sm text-gray-300 mb-2 space-y-1 pl-1">
                    {children}
                </ul>
                ),
            li: ({ children }) => (
                <li className="flex gap-2">
                    <span className="text-white/25 mt-1 shrink-0 text-xs">–</span>
                    <span className="leading-relaxed">{children}</span>
                    </li>
                ),
            code({ inline, className, children }: CodeProps) {
                const match = /language-(\w+)/.exec(className || "");
                const codeText = String(children).replace(/\n$/, "");
                    return !inline && match ? (
                        <div className="relative my-3 rounded-lg overflow-hidden border border-white/8">
                            <div className="flex items-center justify-between bg-white/4 border-b border-white/6 px-3 py-1.5">
                            <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                                {match[1]}
                            </span>
                            <button
                                onClick={() => copyToClipboard(codeText)}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                            >
                                <FiCopy size={11} /> Copy
                            </button>
                            </div>
                            <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                customStyle={{ margin: 0, borderRadius: 0, padding: "0.875rem", fontSize: "0.78rem", background: "#080d12" }}
                            >
                                {codeText}
                            </SyntaxHighlighter>
                        </div>
                        ) : (
                            <code className="bg-white/8 text-yellow-300/80 px-1.5 py-0.5 rounded text-xs font-mono border border-white/8">
                                {children}
                            </code>
                        );
                    },
                };

    return (
        <>
            {/* QUESTION INPUT */}
            <div className="relative w-full">
                <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (aiQuestion.trim()) onAskQuestion(aiQuestion);
                        }
                    }}
                    placeholder="Ask anything… (Enter to send)"
                    rows={2}
                    disabled={isAiThinking || rateCooldown > 0}
                    className="w-full resize-none bg-gray-800 border border-white/8
                               text-sm text-white/80 placeholder:text-white/25
                               rounded-lg px-3 pr-10 py-2 outline-none
                               focus:border-white/20 transition-colors
                               disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                    onClick={() => { if (aiQuestion.trim()) onAskQuestion(aiQuestion); }}
                    disabled={isAiThinking || !aiQuestion.trim() || rateCooldown > 0}
                    className="absolute right-2 bottom-2 w-7 h-7 flex items-center justify-center rounded-md
                               bg-white text-gray-900
                               hover:bg-yellow-500 active:scale-95
                               transition-all duration-150 mb-3 mr-2 disabled:opacity-25 cursor-pointer
                               disabled:cursor-not-allowed"
                >
                    <IoSend size={14} />
                </button>
            </div>

            {/* EXECUTION OUTPUT */}
            <div className="bg-black/60 border border-white/6 rounded-lg
                            px-3 py-2.5 h-24 overflow-auto text-sm
                            font-mono text-white/70 leading-relaxed shrink-0">
                {isRunning ? (
                    <span className="text-white/30 animate-pulse">Running…</span>
                ) : userOutput ? (
                    <pre className="whitespace-pre-wrap">{userOutput}</pre>
                ) : (
                    <span className="text-white/20">Output</span>
                )}
            </div>

            {/* DRAG HANDLE — sits between output box and AI panel */}
            <div
                onMouseDown={onDragStart}
                className="group flex items-center justify-center h-2 cursor-ns-resize
                           rounded-full mx-1 hover:bg-white/8 transition-colors shrink-0"
                title="Drag to resize AI panel"
            >
                {/* Visual grip dots */}
                <div className="flex gap-1 opacity-30 group-hover:opacity-70 transition-opacity">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1 h-1 rounded-full bg-white/60" />
                    ))}
                </div>
            </div>

            {/* AI CHAT OUTPUT — resizable */}
            <div
                ref={aiOutputRef}
                className="bg-gray-800/60 border border-white/8 rounded-xl
                           overflow-auto relative shrink-0"
                style={{ height: aiPanelHeight }}
            >
                {/* Sticky header */}
                <div className="sticky top-0 flex items-center justify-between px-3 py-2
                                bg-gray-900 border-b border-white/6 z-10">
                    <div className="flex items-center gap-2">
                        <img src={geminiLogo} className="w-3.5 h-3.5" />
                        <span className="text-xs text-white/40 font-medium">Gemini</span>
                        {isAiThinking && (
                            <div className="flex gap-1 ml-2">
                                {[0, 150, 300].map((d) => (
                                    <span key={d}
                                        className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                                        style={{ animationDelay: `${d}ms` }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="flex items-center gap-1.5 hover:bg-red-500/20 text-red-500
                                   border border-red-500/40 bg-transparent font-semibold
                                   px-2 py-0.5 rounded-md cursor-pointer transition-colors text-xs"
                    >
                        <AiOutlineClear size={14} /> Clear
                    </button>
                </div>

                <div className="p-3">
                    {/* Mode indicator while thinking */}
                    {isAiThinking && (
                        <div className="text-xs mb-2 font-medium">
                            {mode === "selection" && <span className="text-purple-400">✂️ Analyzing selected code…</span>}
                            {mode === "code" && <span className="text-blue-400">🧠 Reviewing full code…</span>}
                            {mode === "question" && <span className="text-green-400">💬 Answering your question…</span>}
                        </div>
                    )}

                    {/* Empty state */}
                    {history.length === 0 && !isAiThinking ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <img src={geminiLogo} className="w-8 h-8 opacity-20" />
                            <p className="text-xs text-white/25 text-center">
                                Click Ask Gemini or type a question above
                            </p>
                        </div>
                    ) : (
                        history.map((msg, i) => (
                            <div key={i} className="border-b border-white/5 pb-3 mb-1">
                                <div className="text-xs text-white/40 mb-1">
                                    {msg.role === "user" ? "You" : "Gemini"}
                                </div>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents} 
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </>
    );
}