import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { login as apiLogin, getMe, UserInfo } from "../services/api";

interface AuthContextType {
  token: string | null;
  user: UserInfo | null;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  const signIn = useCallback(async (email: string, senha: string) => {
    const tokenData = await apiLogin(email, senha);
    const userInfo = await getMe(tokenData.access_token);
    setToken(tokenData.access_token);
    setUser(userInfo);
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
