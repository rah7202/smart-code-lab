import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import EditorPage from "./components/EditorPage";
import { Toaster } from "react-hot-toast";
import './App.css'

function App() {



  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Toaster position="top-center" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
      </Routes>
    </div>
  )
}

export default App;