import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../src/api/client";

type AuthContext = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContext>({ session: null, loading: true });

export function AuthProvider({ children }: { children: any }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load existing session from localStorage on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep in sync if session changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);