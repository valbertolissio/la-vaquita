import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, borrarToken, getStoredToken, guardarToken } from "../Utilidades/api";
import { Usuario } from "../Utilidades/tipos";

interface AuthContextValue {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; nickname?: string | null; avatarColor?: string | null }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setUser(await api.miPerfil());
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api.iniciarSesion({ email, password });
    await guardarToken(token);
    setUser(user);
  }

  async function register(name: string, email: string, password: string) {
    const { token, user } = await api.registrar({ name, email, password });
    await guardarToken(token);
    setUser(user);
  }

  async function logout() {
    await borrarToken();
    setUser(null);
  }

  async function updateProfile(data: { name?: string; nickname?: string | null; avatarColor?: string | null }) {
    const updated = await api.actualizarMiPerfil(data);
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de ProveedorDeSesion");
  return ctx;
}
