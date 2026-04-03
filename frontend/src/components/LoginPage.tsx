import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { AxiosError } from "axios";

const URL = import.meta.env.VITE_BACKEND_URL

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Enter username and password");
      return;
    }

    try {
      const res = await axios.post(`${URL}/api/auth/signin`, {
        username,
        password,
      });

      const data = res.data;

      localStorage.setItem("token", data.token);
      toast.success("Login successful");
      navigate("/");

    } catch (error) {
        // axios throws on 4xx/5xx so the status check is redundant
        const message = error instanceof AxiosError? error.response?.data?.error || "Login failed" : "An unexpected error occurred";
        toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-4">Sign In</h1>
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
                  onClick={handleLogin}
                  className="w-full bg-green-500 py-2 rounded mb-2 hover:bg-green-600 cursor-pointer"
              >
                  Sign In
              </button>
              <p className="text-sm text-center">Don't have a account ? <span onClick={() => navigate("/signup")} className="text-blue-400 cursor-pointer">Click to Signup</span></p>
          </div>
      </div>
    </div>
  );
};