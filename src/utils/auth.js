// ==================== src/utils/auth.js ====================
const TOKEN_KEY = "admin_session_token";

export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const saveSession = (user) => {
  const sessionData = {
    user,
    timestamp: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 jam
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(sessionData));
};

export const getSession = () => {
  const sessionStr = localStorage.getItem(TOKEN_KEY);
  if (!sessionStr) return null;

  const session = JSON.parse(sessionStr);

  // Cek apakah sesi expired
  if (Date.now() > session.expiresAt) {
    clearSession();
    return null;
  }

  return session.user;
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isSessionValid = () => {
  return getSession() !== null;
};
