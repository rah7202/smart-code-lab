import geminiLogo from "../assets/geminiLogo.png";

interface CodeInputPanelProps {
    userInput: string;
    setUserInput: (v: string) => void;
    isRunning: boolean;
    onRun: () => void;
    isAiThinking: boolean;
    rateCooldown: number;
    aiRequestsLeft: () => number;
    onAnalyzeCode: () => void;
}

export default function CodeInputPanel({
    userInput, setUserInput,
    isRunning, onRun,
    isAiThinking, rateCooldown, aiRequestsLeft, onAnalyzeCode,
}: CodeInputPanelProps) {
    return (
        <div className="flex flex-col gap-2">

            {/* STDIN */}
            <textarea
                className="bg-gray-800 border border-white/8 text-sm text-white/80
                           p-2.5 rounded-lg resize-none placeholder:text-white/25
                           focus:outline-none focus:border-white/20 transition-colors"
                rows={3}
                placeholder="Input (stdin)"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
            />

            {/* ACTION ROW */}
            <div className="flex gap-2 items-center">

                {/* RUN */}
                <button
                    onClick={onRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-3 py-2 rounded-md
                               bg-gray-800 border border-white/10 text-sm text-white/80
                               hover:bg-gray-700 hover:border-white/20
                               active:scale-[0.97] disabled:opacity-40
                               transition-all duration-150 font-medium cursor-pointer"
                >
                    {isRunning ? (
                        <svg className="w-4 h-4 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"
                                strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-green-400" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2.5 1.5l8 4.5-8 4.5V1.5z" />
                        </svg>
                    )}
                </button>

                {/* ASK GEMINI */}
                <button
                    onClick={onAnalyzeCode}
                    disabled={isAiThinking || rateCooldown > 0}
                    className="flex items-center gap-2 font-semibold
                               bg-gray-800 border border-white/10 text-sm text-white/80
                               hover:bg-gray-700 hover:border-white/20 active:scale-[0.97]
                               px-3 py-1.5 rounded-md cursor-pointer
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-all duration-150"
                >
                    <img src={geminiLogo} className="w-4 h-4" />
                    {isAiThinking ? "Thinking…" : "Ask Gemini"}
                </button>

                {/* RATE LIMIT PILL */}
                {rateCooldown > 0 ? (
                    <span className="text-xs px-2 py-0.5 rounded-full
                                     bg-orange-500/15 text-orange-400 border border-orange-500/20">
                        {rateCooldown}s
                    </span>
                ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border
                        ${aiRequestsLeft() >= 3
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : aiRequestsLeft() >= 1
                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                        {aiRequestsLeft()}/5
                    </span>
                )}
            </div>
        </div>
    );
}