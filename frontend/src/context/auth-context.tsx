"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error?: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data?: any; error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  resetPassword: (email: string, redirectTo?: string) => Promise<{ data?: any; error?: any }>;
  updatePassword: (password: string) => Promise<{ data?: any; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!isSupabaseConfigured) {
          // If not configured, stop loading immediately
          if (mounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[AquaTwin Auth] Error reading session:", error.message);
        }

        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[AquaTwin Auth] Unexpected initialization error:", err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: {
          message:
            "Supabase Anon Key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local",
        },
      };
    }
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (result.data.session) {
        setSession(result.data.session);
        setUser(result.data.session.user);
      }
      return result;
    } catch (err: any) {
      return { error: { message: err?.message || "An unexpected error occurred during sign in." } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: {
          message:
            "Supabase Anon Key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local",
        },
      };
    }
    try {
      const result = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      if (result.data.session) {
        setSession(result.data.session);
        setUser(result.data.session.user);
      }
      return result;
    } catch (err: any) {
      return { error: { message: err?.message || "An unexpected error occurred during account creation." } };
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        const result = await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        return result;
      }
      setUser(null);
      setSession(null);
      return {};
    } catch (err: any) {
      setUser(null);
      setSession(null);
      return { error: { message: err?.message || "Error signing out" } };
    }
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: {
          message:
            "Supabase Anon Key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local",
        },
      };
    }
    try {
      const redirectUrl =
        redirectTo ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined);

      return await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
    } catch (err: any) {
      return { error: { message: err?.message || "Error requesting password reset" } };
    }
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: {
          message:
            "Supabase Anon Key is not configured. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local",
        },
      };
    }
    try {
      return await supabase.auth.updateUser({ password });
    } catch (err: any) {
      return { error: { message: err?.message || "Error updating password" } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
