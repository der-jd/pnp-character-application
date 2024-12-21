"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient } from "../cognitoConfig";

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
  logout: () => void;
  accessToken: string | null;
  setAccessToken: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (accessToken) {
        try {
          const command = new GetUserCommand({
            AccessToken: accessToken,
          });
          await cognitoClient.send(command);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error verifying token:", error);
          setIsAuthenticated(false);
          setAccessToken(null);
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, [accessToken]);

  const logout = () => {
    setAccessToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, loading, logout, accessToken, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
