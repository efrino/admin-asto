// ==================== src/hooks/useAuth.js ====================
import { useState, useEffect } from "react";
import { supabase } from "../config/supabase";
import {
  hashPassword,
  saveSession,
  getSession,
  clearSession,
} from "../utils/auth";

export const useAuth = () => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const savedUser = getSession();
    if (savedUser) {
      setAdmin(savedUser);
    }
    setLoading(false);
  };

  const login = async (nrp, password) => {
    try {
      const hashedPassword = await hashPassword(password);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("nrp", nrp.toUpperCase())
        .eq("password", hashedPassword)
        .eq("role", "admin");

      if (userError) {
        throw new Error("Error database: " + userError.message);
      }

      if (!userData || userData.length === 0) {
        throw new Error(
          "Login gagal. NRP atau password salah, atau user bukan admin."
        );
      }

      const user = userData[0];

      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", user.id);

      saveSession(user);
      setAdmin(user);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearSession();
    setAdmin(null);
  };

  return { admin, loading, login, logout };
};
