"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider";
import { cognitoClient, cognitoConfig } from "../../context/CognitoConfig";
import { useAuth } from "../../context/AuthContext";

export default function ConfirmSignUp() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/protected/dashboard");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: cognitoConfig.clientId,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(command);

      console.log("User confirmed successfully");
      router.push("/auth/signin");
    } catch (error) {
      setError("Failed to confirm sign up. Please try again.");
      console.error("Error confirming sign up:", error);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 relative">
        <Image src="/images/splash-image.png" alt="Confirm Sign Up Image" layout="fill" objectFit="cover" priority />
      </div>
      <div className="w-1/2 flex items-center justify-center bg-gray-100 overflow-y-auto">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="flex justify-center">
            <Image src="/images/logo.png" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900">Confirm Sign Up</h1>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Confirmation Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
