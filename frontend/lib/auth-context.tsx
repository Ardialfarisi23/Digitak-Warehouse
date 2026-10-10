"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: string;
  name?: string;
  username: string;
  email?: string;
  role: string;
  isActive?: boolean;
  must_change_password?: boolean;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ============================================================
  // RESTORE SESSION
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (!storedToken || !storedUser) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const res = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!isMounted) return;

          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              setToken(null);
              setUser(null);
            }
            setIsLoading(false);
            return;
          }

          const parsedUser: User = JSON.parse(storedUser);
          let restoredUser = parsedUser;

          try {
            const responseData = await res.json();
            if (responseData?.success && responseData?.data) {
              restoredUser = { ...restoredUser, ...responseData.data };
              localStorage.setItem("user", JSON.stringify(restoredUser));
            }
          } catch {}

          if (isMounted) {
            setToken(storedToken);
            setUser(restoredUser);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);

          if (!isMounted) return;

          if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
            console.warn("Validasi session timeout, menggunakan data lokal");
          } else if (fetchError instanceof TypeError && fetchError.message === "Failed to fetch") {
            console.warn("Backend tidak tersedia, menggunakan data session lokal");
          } else {
            console.error("Gagal validasi session:", fetchError);
          }

          const parsedUser: User = JSON.parse(storedUser);
          if (isMounted) {
            setToken(storedToken);
            setUser(parsedUser);
          }
        }
      } catch (error) {
        console.error("Gagal membaca session:", error);
        if (isMounted) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================

  const login = (user: User, token: string) => {
    setIsLoggingOut(false);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    setToken(token);
    setUser(user);
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    setIsLoggingOut(true);
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  // ============================================================
  // PROVIDER
  // ============================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        isLoggingOut,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// USE AUTH
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}