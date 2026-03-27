import { useEffect, useState } from "react";
import axios from "axios";

const URL = "http://localhost:8000";

interface Snapshot {
    id: string;
    code: string;
    language: string;
    createdAt: string;
}

interface Props {
    roomId: string;
    onRestore: (snapshot: Snapshot) => void;
    refreshTrigger: number
}

export default function VersionHistory({ roomId, onRestore, refreshTrigger }: Props) {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

    useEffect(() => {
        const fetchSnapshots = async () => {
            const res = await axios.get(`${URL}/snapshot/${roomId}`);
            setSnapshots(res.data);
        };

        fetchSnapshots();
    }, [roomId, refreshTrigger]);

    return (
        <div className=" border-white/10 ">
            <h3 className="text-sm font-bold text-white/60 mb-2">Version History</h3>

            <div className="max-h-40 overflow-auto space-y-2">
                {snapshots.map((snap) => (
                    <div
                        key={snap.id}
                        className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                        onClick={() => onRestore(snap)}
                    >
                        <div className="text-xs text-white/70">
                            {new Date(snap.createdAt).toLocaleTimeString()}
                        </div>

                        <div className="text-[10px] text-white/40">
                            {snap.language}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}