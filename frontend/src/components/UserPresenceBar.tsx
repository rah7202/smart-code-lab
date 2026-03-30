interface User {
    username: string;
    color: string;
    socketId: string;
}

interface UserPresenceBarProps {
    users: User[];
}

export default function UserPresenceBar({ users }: UserPresenceBarProps) {
    if (!users.length) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border-b border-white/8">
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
                In Room
            </span>
            <div className="flex gap-1.5">
                {users.map((user) => (
                    <div
                        key={user.socketId}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-black"
                        style={{ backgroundColor: user.color || "#4ECDC4" }}
                        title={user.username}
                    >
                    <span className="w-1.5 h-1.5 rounded-full bg-black/30"/>
                        <span>
                            {user.username}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}