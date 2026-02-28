"use client";

import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { AuthViewModel } from "@/src/lib/presentation/viewmodels/AuthViewModel";
import { AuthService } from "@/src/lib/services";

/**
 * AuthContext - React Context wrapper for AuthViewModel
 *
 * - Context is just a delivery mechanism (React-specific)
 * - AuthViewModel contains all the business logic
 * - Provides global authentication state to component tree
 */
const AuthContext = createContext<AuthViewModel | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Create singleton instances
  const authViewModel = useMemo(() => {
    const authService = new AuthService();
    return new AuthViewModel(authService);
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    authViewModel.initialize();
  }, [authViewModel]);

  return <AuthContext.Provider value={authViewModel}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access AuthViewModel from any component
 *
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Hook to access auth state with automatic re-renders
 *
 * This uses useSyncExternalStore to subscribe to AuthViewModel state changes
 * Components will re-render when authentication state changes
 */
export const useAuthState = () => {
  const authViewModel = useAuth();

  return useSyncExternalStore(
    (callback) => authViewModel.subscribe(callback),
    () => authViewModel.getState(),
    () => ({
      isLoading: false,
      error: null,
      isAuthenticated: false,
      user: null,
      tokens: null,
      isInitialized: false,
    }), // getServerSnapshot - return safe default for SSR
  );
};
