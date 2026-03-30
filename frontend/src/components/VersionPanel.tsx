// src/components/VersionPanel.tsx
import { useState } from "react";
import { FaLockOpen } from "react-icons/fa";
import { HiLockClosed } from "react-icons/hi";
import VersionHistory from "./VersionHistory";

interface VersionPanelProps {
    roomId: string;
    refreshHistory: number;
    onRestore: (snapshot: { code: string, language: string}) => void;
}

export default function VersionPanel({ roomId, refreshHistory, onRestore }: VersionPanelProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-white/10 mr-1">
            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20
                               text-purple-400 border border-purple-500/20 font-semibold
                               px-2 py-1 rounded-md cursor-pointer transition-colors text-sm"
                >
                    <FaLockOpen size={16} /> Open Version Panel
                </button>
            ) : (
                <div>
                    <button
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-1.5 hover:bg-red-500/20 text-red-500
                                   border border-red-500/40 bg-transparent font-semibold
                                   px-2 py-1 rounded-md cursor-pointer transition-colors text-sm mb-2"
                    >
                        <HiLockClosed size={16} /> Close Version Panel
                    </button>
                    <VersionHistory
                        roomId={roomId}
                        onRestore={onRestore}
                        refreshTrigger={refreshHistory}
                    />
                </div>
            )}
        </div>
    );
}