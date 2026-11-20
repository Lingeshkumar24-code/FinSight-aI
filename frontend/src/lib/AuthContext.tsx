import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { api, setAuthToken, loadStoredToken, ApiError } from "./api";

interface AuthState {
  isAuthenticated: boolean;
  businessId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string, businessName?: string) => Promise<void>;
  sendOtp: (email: string, purpose?: "login" | "register" | "reset") => Promise<any>;
  loginWithOtp: (email: string, otp: string, fullName?: string, businessName?: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const existingToken = loadStoredToken();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(existingToken));
  const [businessId, setBusinessId] = useState<string | null>(
    existingToken ? localStorage.getItem("finsight_business_id") : null
  );
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const resp = await api.login(email, password);
      setAuthToken(resp.access_token);
      localStorage.setItem("finsight_business_id", resp.business_id);
      setBusinessId(resp.business_id);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string, businessName?: string) => {
    setError(null);
    try {
      const resp = await api.register({ email, password, full_name: fullName, business_name: businessName });
      setAuthToken(resp.access_token);
      localStorage.setItem("finsight_business_id", resp.business_id);
      setBusinessId(resp.business_id);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
      throw err;
    }
  }, []);

  const sendOtp = useCallback(async (email: string, purpose: "login" | "register" | "reset" = "login") => {
    setError(null);
    try {
      return await api.sendOtp(email, purpose);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send verification code");
      throw err;
    }
  }, []);

  const loginWithOtp = useCallback(
    async (email: string, otp: string, fullName?: string, businessName?: string) => {
      setError(null);
      try {
        const resp = await api.verifyOtp({ email, otp, full_name: fullName, business_name: businessName });
        setAuthToken(resp.access_token);
        localStorage.setItem("finsight_business_id", resp.business_id);
        setBusinessId(resp.business_id);
        setIsAuthenticated(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Verification failed");
        throw err;
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    setError(null);
    try {
      await api.resetPassword({ email, otp, new_password: newPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Password reset failed");
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem("finsight_business_id");
    setIsAuthenticated(false);
    setBusinessId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        businessId,
        login,
        register,
        sendOtp,
        loginWithOtp,
        resetPassword,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
