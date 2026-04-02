import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const URL = import.meta.env.VITE_BACKEND_URL;

  const handleSignup = async () => {
    try {
      if (!username || !password) {
        toast.error("Username and password required");
        return;
      }

      await axios.post(`${URL}/api/auth/signup`, {
        username,
        password,
      });

      toast.success("User created");

      navigate("/login");
    } catch (error: any) {
        // axios throws on 4xx/5xx so the status check is redundant
        const message = error.response?.data?.error || "Signup failed";
        toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center">
       <h1 className="text-4xl font-bold mb-4">Sign Up</h1>
        <div className="bg-gray-800 p-6 rounded-lg shadow-md w-125">
            <input
                className="w-full p-2 mb-3 rounded bg-gray-700"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="password"
                className="w-full p-2 mb-3 rounded bg-gray-700"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button
                onClick={handleSignup}
                className="w-full bg-green-500 py-2 rounded mb-2 hover:bg-green-600 cursor-pointer"
            >
                Sign Up
            </button>
            <p className="text-sm text-center">Already have a account ? <span onClick={() => navigate("/login")} className="text-blue-400 cursor-pointer">Click to Signin</span></p>
        </div>
      </div>
    </div>
  );
}