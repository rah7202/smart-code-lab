import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { isTokenValid } from "./auth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
    
  const token = localStorage.getItem("token");
  
  if (!isTokenValid(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/login"/>
  }

  return children;
}