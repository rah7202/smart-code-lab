import { useState, useRef, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const URL = import.meta.env.VITE_BACKEND_URL;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60_000;

interface UseAIProps {
    userCode: string;
    userLang: string;
    roomId: string;
}

interface AIMessage {
    role: "user" | "ai";
    content: string;
}

export function useAI({ userCode, userLang, roomId }: UseAIProps) {
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [rateCooldown, setRateCooldown] = useState(0);
    const [aiQuestion, setAiQuestion] = useState("");
    const [history, setHistory] = useState<AIMessage[]>([]);

    const [mode, setMode] = useState<"code" | "selection" | "question">("code");

    const aiTimestamps = useRef<number[]>([]);
    const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const aiOutputRef = useRef<HTMLDivElement | null>(null);
    const isUserScrolledUp = useRef(false);

    // AUTO SCROLL
    useEffect(() => {
        const el = aiOutputRef.current;
        if (!el) return;
        const handleScroll = () => {
            isUserScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight >= 50;
        };
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${URL}/ai/history/${roomId}`);
                setHistory(res.data);
            } catch (e) {
                console.error("FETCH ERROR:", e); // This will show up in your Vitest terminal
            }
        };
        if (roomId) fetchHistory();
    }, [roomId]);


    const canAskAi = () => {
        const now = Date.now();
        aiTimestamps.current = aiTimestamps.current.filter((t) => now - t < RATE_LIMIT_WINDOW);
        return aiTimestamps.current.length < RATE_LIMIT_MAX;
    };

    const aiRequestsLeft = () => {
        const now = Date.now();
        const active = aiTimestamps.current.filter((t) => now - t < RATE_LIMIT_WINDOW);
        return Math.max(0, RATE_LIMIT_MAX - active.length);
    };

    const startCooldownTicker = () => {
        // Always clear any existing interval first
        if (cooldownTimer.current) {
            clearInterval(cooldownTimer.current);
            cooldownTimer.current = null;
        }

        cooldownTimer.current = setInterval(() => {
        // If no timestamps exist, reset cooldown and stop the interval
        if (!aiTimestamps.current.length) { 
                setRateCooldown(0); 
                if (cooldownTimer.current) clearInterval(cooldownTimer.current);
                cooldownTimer.current = null;
                return; 
        }

            const oldest = aiTimestamps.current[0];
            const now = Date.now();
            const elapsed = now - oldest;
            const remaining = RATE_LIMIT_WINDOW - elapsed;
            const secs = Math.ceil(remaining / 1000);

            // If cooldown has finished
            if (secs <= 0) {
                setRateCooldown(0);
                if (cooldownTimer.current) clearInterval(cooldownTimer.current);
                cooldownTimer.current = null;
            } else {
                setRateCooldown(secs);
            }
        }, 500);
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (cooldownTimer.current) {
                clearInterval(cooldownTimer.current);
            }
        };
    }, []);

    // shared rate limit check + request sender
    const sendPrompt = async (prompt: string) => {
        if (!canAskAi()) {
            const oldest = aiTimestamps.current[0];
            const secs = Math.ceil((RATE_LIMIT_WINDOW - (Date.now() - oldest)) / 1000);
            setRateCooldown(secs);
            startCooldownTicker();
            toast.error(`Rate limit reached. Try again in ${secs}s`);
            return;
        }
        aiTimestamps.current.push(Date.now());
        setIsAiThinking(true);

        try {
            const res = await axios.post(`${URL}/ai/generate`, { prompt, roomId });

            setHistory(prev => [
                ...prev,
                { role: "user", content: prompt },
                { role: "ai", content: res.data.data },
            ])

        } catch {
            setHistory(prev => [
                ...prev,
                { role: "ai", content: "AI Error — check your server connection." },
            ])
        }
        setIsAiThinking(false);
    };

    // ASK GEMINI BUTTON — always analyzes the full current code in editor
    const analyzeCode = () => {
        const prompt = `You are a senior software engineer reviewing code.
 
Analyze the code below and respond in clean, valid Markdown.
 
Use these sections exactly:
 
## 🔍 Explanation
Brief overview of what the code does.
 
## 🪜 Step-by-step Breakdown
- Step 1: ...
- Step 2: ...
 
## 🐛 Bugs
- List any bugs found, or write "No bugs found."
 
## 💡 Improvements
\`\`\`${userLang}
// Show improved code here
\`\`\`
- Explain what changed and why.
 
Rules:
- Always wrap code suggestions in fenced code blocks with the language tag
- Use bullet points for lists
- Keep explanations concise
 
Code to analyze:
\`\`\`${userLang}
${userCode}
\`\`\``;
        setMode("code");
        sendPrompt(prompt);
    };
    

    // QUESTION INPUT — freeform, no code injected, just chat
    const askQuestion = (question: string) => {
        if (!question.trim()) return;
        const prompt = `You are a helpful coding assistant. Answer the following question clearly in Markdown.
 
${question.trim()}`;
        setMode("question");
        sendPrompt(prompt);
        setAiQuestion("");
    };

    // SELECTION TOOLBAR — sends selected snippet + specific action prompt
    const askAboutSelection = (question: string, selectedCode: string) => {


        const prompt = `You are a senior software engineer. A user selected this ${userLang} snippet:
 
\`\`\`${userLang}
${selectedCode}
\`\`\`

Task:
${question} 

Important:
- Be specific to ONLY this selected code
- Do not assume missing context
- Keep response concise and structured
 
Respond in clean, valid Markdown. Use code blocks with language tags for any code suggestions.`;
        setMode("selection");
        sendPrompt(prompt);
    };

    return {
        mode,
        history,
        setHistory,
        isAiThinking,
        rateCooldown,
        aiQuestion,
        setAiQuestion,
        aiRequestsLeft,
        analyzeCode,
        askQuestion,
        askAboutSelection,
        bottomRef,
        aiOutputRef,
    };
}