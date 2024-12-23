"use client";

import { AuthProvider } from "../context/AuthContext";
import Header from "@/components/Header";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthProvider>
        <Header />
        <main>{children}</main>
      </AuthProvider>
    </>
  );
}
