// src/components/AuthGuard.tsx
import { supabase } from "../api/client";
import { useAuth } from "../../context/AuthContext";

export function AuthGuard({ children }: { children: any }) {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}