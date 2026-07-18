import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type User = {
  email: string;
  role: string;
  id?: string;
  name?: string;
} | null;

type AuthContextType = {
  user: User;
  isRoot: boolean;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (user: any, isRoot: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isRoot: false,
  isAuthenticated: false,
  hydrated: false,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User>(null);
  const [isRoot, setIsRoot] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const rawUser = await AsyncStorage.getItem('auth_user');
        const rawIsRoot = await AsyncStorage.getItem('auth_is_root');
        if (rawUser) {
          setUser(JSON.parse(rawUser));
        }
        if (rawIsRoot) {
          setIsRoot(rawIsRoot === 'true');
        }
      } catch {
      } finally {
        setHydrated(true);
      }
    };

    hydrate();
  }, []);

  const login = (userData: any, rootUser: boolean) => {
    setUser(userData);
    setIsRoot(rootUser);
    AsyncStorage.setItem('auth_user', JSON.stringify(userData));
    AsyncStorage.setItem('auth_is_root', rootUser ? 'true' : 'false');
  };

  const logout = () => {
    setUser(null);
    setIsRoot(false);
    AsyncStorage.removeItem('auth_user');
    AsyncStorage.removeItem('auth_is_root');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isRoot,
        isAuthenticated: !!user,
        hydrated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
