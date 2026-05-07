import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/authAxios";
import toast from "react-hot-toast";
import { socket } from "../socket";
import { getUserFromToken } from "../utils/auth";
import { AxiosError } from "axios";
import { FiCopy } from "react-icons/fi";
import { FaCheck } from "react-icons/fa"

import Footer from "./Footer";

export default function Home() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    const [copied, setCopied] = useState(false);

    const user = getUserFromToken();
    const name = user?.username?.charAt(0).toUpperCase() + user?.username?.slice(1);


    const createRoom = async () => {
        try {
            const res = await api.post(`/room/create`);
            const data = res.data;

            setRoomId(data.roomId);
            toast.success("Room created successfully");
        } catch (error) {
            const message = error instanceof AxiosError ? error.response?.data?.error || "Request failed" : "An unexpected error occurred" ;
            toast.error(message);
        }
    };

    const joinRoom = () => {
        if (!roomId) {
            toast.error("Please enter a room ID");
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            toast.error("Please login first");
            navigate("/login");
            return;
        }

        navigate(`/editor/${roomId}`);
        toast.success("Joined room successfully");
    };

    const handleCopy = async () => {
        if (!roomId) return

        try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
            toast.success("Room ID Copied");

            setTimeout(() => setCopied(false), 1500);


        } catch {
            toast.error("Copy Failed");
        }
    };

    const handleLogout = () => {

        try {
            localStorage.removeItem("token");
            socket.disconnect();
            navigate("/login");
            toast.success("Logged Out successfully");

        } catch {
            toast.error("Logged Out Failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center">
                <h1 className="text-4xl font-bold mb-4">Smart Code Lab</h1>
                {user && (
                    <h2 className="text-2xl mb-4 text-gray-300">
                        Welcome <span className="text-green-400">{name}</span>, happy to see you again 
                    </h2>
                )}
            
                <div className="bg-gray-800 p-6 rounded-lg shadow-md w-125">
                    <div className="relative w-full">
                        <input className="w-full p-2 mb-3 rounded bg-gray-700" placeholder="Room ID" value={roomId} onChange={(e) => { setRoomId(e.target.value) }} />
                        {roomId.trim() && (  
                            <button disabled={!roomId} 
                                onClick={handleCopy} 
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 cursor-pointer">
                                {copied ? <FaCheck size={18} /> : <FiCopy size={18} />} 
                            </button> 
                        )}
                    </div>
                        <button onClick={joinRoom} className="w-full bg-green-500 py-2 rounded mb-2 hover:bg-green-600 cursor-pointer">
                            Join Room
                        </button>
                    
                    <button onClick={handleLogout} className="w-full bg-blue-500 py-2 rounded mb-2 hover:bg-blue-600 cursor-pointer">
                        Logout
                    </button>
                    <p className="text-sm text-center">Don't have a room Id ? <span onClick={createRoom} className="text-blue-400 cursor-pointer">Create a new room</span></p>
                </div>
            </div>
            <div className="absolute bottom-0 left-1/2 right-1/2 mb-1">
                <Footer URL="https://github.com/goyalatwork007/smart-code-lab" size={22} />
            </div>

        </div>
    );
};