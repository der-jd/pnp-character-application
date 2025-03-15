"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoConfig, cognitoClient } from "../../global/CognitoConfig";
import { useAuth } from "../../global/AuthContext";
import { createTenantId } from "@/lib/Api/tenant";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { setIsAuthenticated, isAuthenticated, setAccessToken, setIdToken } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/protected/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: cognitoConfig.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);

      if (response.AuthenticationResult?.AccessToken) {
        setAccessToken(response.AuthenticationResult.AccessToken);
        setIdToken(response.AuthenticationResult.IdToken ?? null);
        console.log("ID TOKEN:");
        //console.log(response.AuthenticationResult.IdToken); // TODO remove after test and only activate locally
        setIsAuthenticated(true);
        createTenantId(response.AuthenticationResult.IdToken, response.AuthenticationResult.RefreshToken);
        router.push("/protected/dashboard");
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      setError("Failed to sign in. Please check your credentials.");
      console.error("Error signing in:", error);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 relative">
        <Image src="/images/splash-image.png" alt="Sign In Image" layout="fill" objectFit="cover" priority />
      </div>
      <div className="w-1/2 flex items-center justify-center bg-gray-100 overflow-y-auto">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="flex justify-center">
            <Image src="/images/logo.png" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900">Sign In</h1>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign In
              </button>
            </div>
          </form>
          <div className="text-sm text-center">
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Don&apost have an account? Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
