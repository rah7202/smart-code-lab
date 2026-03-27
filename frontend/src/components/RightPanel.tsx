
import CodeInputPanel from "./CodeInputPanel";
import AIPanel from "./AIPanel";
import VersionPanel from "./VersionPanel";

interface RightPanelProps {
    roomId: string;
    refreshHistory: number;

    // stdin / run
    userInput: string;
    setUserInput: (v: string) => void;
    isRunning: boolean;
    onRun: () => void;
    userOutput: string;

    // AI
    mode: "code" | "selection" | "question";
    history: any[];
    setHistory: (v: any[]) => void;
    isAiThinking: boolean;
    rateCooldown: number;
    aiRequestsLeft: () => number;
    aiQuestion: string;
    setAiQuestion: (v: string) => void;
    onAnalyzeCode: () => void;
    onAskQuestion: (q: string) => void;
    aiOutput: string;
    aiOutputRef: React.RefObject<HTMLDivElement | null>;
    bottomRef: React.RefObject<HTMLDivElement | null>;

    // snapshot
    handleRestoreSnapshot: (snapshot: any) => void;
}

export default function RightPanel({
    roomId, refreshHistory,
    userInput, setUserInput, isRunning, onRun, userOutput,
    mode, history, setHistory,
    isAiThinking, rateCooldown, aiRequestsLeft,
    aiQuestion, setAiQuestion, onAnalyzeCode, onAskQuestion,
    aiOutput, aiOutputRef, bottomRef,
    handleRestoreSnapshot
}: RightPanelProps) {
    return (
        <div className="w-1/3 bg-gray-900 text-white p-2 flex flex-col gap-2 min-h-0">

            <CodeInputPanel
                userInput={userInput}
                setUserInput={setUserInput}
                isRunning={isRunning}
                onRun={onRun}
                isAiThinking={isAiThinking}
                rateCooldown={rateCooldown}
                aiRequestsLeft={aiRequestsLeft}
                onAnalyzeCode={onAnalyzeCode}
            />

            <AIPanel
                roomId={roomId}
                mode={mode}
                history={history}
                setHistory={setHistory}
                isAiThinking={isAiThinking}
                rateCooldown={rateCooldown}
                aiQuestion={aiQuestion}
                setAiQuestion={setAiQuestion}
                onAskQuestion={onAskQuestion}
                aiOutput={aiOutput}
                isRunning={isRunning}
                userOutput={userOutput}
                aiOutputRef={aiOutputRef}
                bottomRef={bottomRef}
            />

            <VersionPanel
                roomId={roomId}
                refreshHistory={refreshHistory}
                onRestore={handleRestoreSnapshot}
            />
        </div>
    );
}