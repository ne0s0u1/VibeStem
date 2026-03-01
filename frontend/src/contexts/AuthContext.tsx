import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { account } from '../lib/appwrite';
import type { Models } from 'appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAvatar: (patch: {
    avatarUrl?: string;
    avatarFileId?: string;
    avatarBucketId?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const u = await account.get();
    setUser(u);
  };

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    await refreshUser();
  };

  const register = async (email: string, password: string, name: string) => {
    await account.create('unique()', email, password, name);
    await login(email, password);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  const updateAvatar = async (patch: {
    avatarUrl?: string;
    avatarFileId?: string;
    avatarBucketId?: string;
  }) => {
    const currentPrefs = (user?.prefs ?? {}) as Record<string, unknown>;
    await account.updatePrefs({
      ...currentPrefs,
      ...patch,
      avatarUpdatedAt: new Date().toISOString(),
    });
    await refreshUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}