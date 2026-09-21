import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  userId: string | null;
  login: (token: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "edu-restart-auth";

function readStoredAuth(): { token: string; userId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStoredAuth();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [userId, setUserId] = useState<string | null>(stored?.userId ?? null);

  const value = useMemo<AuthState>(
    () => ({
      token,
      userId,
      login: (newToken, newUserId) => {
        setToken(newToken);
        setUserId(newUserId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, userId: newUserId }));
      },
      logout: () => {
        setToken(null);
        setUserId(null);
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [token, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth doit être utilisé sous AuthProvider");
  return context;
}
