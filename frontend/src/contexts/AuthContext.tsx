import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { account } from '../lib/appwrite';
import type { Models } from 'appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    account.get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
    } catch (err: unknown) {
      // If a valid session already exists (user closed browser without logging out),
      // Appwrite throws "user_session_already_exists". Recover by reusing it.
      const isSessionActive =
        err !== null &&
        typeof err === 'object' &&
        (
          ('type' in err && err.type === 'user_session_already_exists') ||
          ('message' in err && typeof err.message === 'string' && err.message.includes('session is active'))
        );
      if (!isSessionActive) throw err;
      // Session already exists — just restore it, no need to create a new one.
    }
    const u = await account.get();
    setUser(u);
  };

  const register = async (email: string, password: string, name: string) => {
    await account.create('unique()', email, password, name);
    await login(email, password);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}