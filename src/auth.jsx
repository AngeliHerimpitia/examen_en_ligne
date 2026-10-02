import { createContext, useContext, useState } from 'react';
import { getSession, saveSession } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// user = { role: 'etudiant' | 'professeur' | 'admin', ...profil renvoyé par /api/moi }
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (getSession() || {}).user || null);

  const login = (token, u) => { saveSession({ token, user: u }); setUser(u); };
  const logout = () => { saveSession(null); setUser(null); };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
