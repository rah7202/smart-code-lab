import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import toast from "react-hot-toast";
import { v4 as uuid } from "uuid";
import Footer from "./Footer";

export default function Home() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("");

    const generateRoomId = () => {
        const id = uuid();
        setRoomId(id);
        toast.success("Room ID generated successfully");
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error("Please enter room ID and username");
            return;
        }

        localStorage.setItem("username", username);

        socket.io.opts.query = { RoomId: roomId, username };
        socket.connect();

        //socket.emit("join", { RoomId: roomId, username });

        navigate(`/editor/${roomId}`, { state: { username } });
        toast.success("Joined room successfully");
    };


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center">
                <h1 className="text-4xl font-bold mb-4">Smart Code Lab</h1>
                <div className="bg-gray-800 p-6 rounded-lg shadow-md-w-[400px]">
                    <input className="w-full p-2 mb-3 rounded bg-gray-700" placeholder="Room ID" value={roomId} onChange={(e) => { setRoomId(e.target.value) }} />
                    <input className="w-full p-2 mb-3 rounded bg-gray-700" placeholder="Username" value={username} onChange={(e) => { setUsername(e.target.value) }} />

                    <button onClick={joinRoom} className="w-full bg-green-500 py-2 rounded mb-2 hover:bg-green-600 cursor-pointer">
                        JOIN
                    </button>
                    <p className="text-sm text-center">Don't have a room Id ? <span onClick={generateRoomId} className="text-blue-400 cursor-pointer">Create a new room</span></p>
                </div>
            </div>
            <div className="absolute bottom-0 left-1/2 right-1/2 mb-1">
                <Footer URL="https://github.com/rah7202/smart-code-lab" size={22} />
            </div>

        </div>
    );
}