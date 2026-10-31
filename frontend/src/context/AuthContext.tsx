import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  login as authenticate,
  logout as endSession,
  refreshAuthSession,
  type AuthenticatedUser,
} from "../services/authService";
import { setAccessToken } from "../services/api";

type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  status: AuthStatus;
  error: string | null;
  signIn: (email: string, password: string) => Promise<AuthenticatedUser>;
  signOut: () => Promise<void>;
  retrySession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const retrySession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const currentUser = await refreshAuthSession();
      setUser(currentUser);
      setStatus("authenticated");
    } catch (sessionError) {
      setAccessToken(null);
      setUser(null);
      if (isUnauthorized(sessionError)) {
        setStatus("anonymous");
        return;
      }
      setStatus("error");
      setError("We couldn't verify your session. Check your connection and retry.");
    }
  }, []);

  useEffect(() => {
    void retrySession();
  }, [retrySession]);

  useEffect(() => {
    function handleExpiredSession() {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
      setError(null);
    }
    window.addEventListener("brightloop:session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("brightloop:session-expired", handleExpiredSession);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const authenticatedUser = await authenticate({ email, password });
    setUser(authenticatedUser);
    setStatus("authenticated");
    setError(null);
    return authenticatedUser;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await endSession();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, error, signIn, signOut, retrySession }),
    [user, status, error, signIn, signOut, retrySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}