import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("cafe_user");
      if (!saved || saved === "null" || saved === "undefined") return null;
      const parsed = JSON.parse(saved);
      return parsed && parsed.role ? parsed : null;
    } catch {
      return null;
    }
  });

  const loginUser = (userData) => {
    if (!userData || !userData.role) return;
    setUser(userData);
    try {
      localStorage.setItem("cafe_user", JSON.stringify(userData));
    } catch {}
  };

  const logoutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem("cafe_user");
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}