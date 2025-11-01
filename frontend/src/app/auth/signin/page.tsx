"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignInViewModel } from "@/src/hooks/useSignInViewModel";
import { useAuth, useAuthState } from "@global/AuthContext";
import { useCharacterStore } from "@global/characterStore";
import { featureLogger } from "@/src/lib/utils/featureLogger";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  
  // Get AuthViewModel instance and current auth state
  const authViewModel = useAuth();
  const { isAuthenticated } = useAuthState();
  const updateAvailableCharacters = useCharacterStore((state) => state.updateAvailableCharacters);

  // Use SignInViewModel hook
  const { isLoading, error, signIn, clearError, onSuccess } = useSignInViewModel();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      featureLogger.debug('ui', 'SignIn', 'Already authenticated, redirecting to dashboard');
      router.push("/protected/dashboard");
    }
  }, [isAuthenticated, router]);

  // Setup success callback
  useEffect(() => {
    onSuccess((data) => {
      featureLogger.info('ui', 'SignIn', 'Sign in successful, updating auth state');
      featureLogger.debug('ui', 'SignIn', 'User ID:', data.user.userId);
      
      // Update AuthViewModel with authenticated state (data contains tokens and user)
      authViewModel.setAuthState(data.tokens, data.user);
      
      // Load characters
      updateAvailableCharacters(data.tokens.idToken);
      
      // Navigate to dashboard
      router.push("/protected/dashboard");
    });
  }, [onSuccess, authViewModel, updateAvailableCharacters, router]);

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    featureLogger.debug('ui', 'SignIn', 'Form submitted, signing in:', email);
    
    await signIn({
      email,
      password,
    });
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
          
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}
          
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
                disabled={isLoading}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                disabled={isLoading}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>
          <div className="text-sm text-center">
            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Don&apos;t have an account? Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
