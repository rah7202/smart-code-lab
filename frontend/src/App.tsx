import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { isTokenValid } from "./utils/auth";
import Home from "./components/Home";
import EditorPage from "./components/EditorPage";
import Login from "./components/LoginPage";
import Signup from "./components/Signup";
import { ProtectedRoute } from "./utils/ProtectedRoute";
import './App.css'

function App() {

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Toaster position="top-center" />

      <Routes>
        <Route 
            path="/login" 
            element={isTokenValid(localStorage.getItem("token")) ? <Navigate to="/" /> : <Login />}  
        />
        
        <Route 
            path="/signup" 
            element={isTokenValid(localStorage.getItem("token")) ? <Navigate to="/" /> : <Signup />}  
        />

        <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
        />

        <Route 
            path="/editor/:roomId" 
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>

            } 
        />

        <Route path="*" element={<Navigate to="/" />} />



      </Routes>
    </div>
  )
}

export default App;
