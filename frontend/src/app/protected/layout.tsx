"use client";

import Header from "@lib/components/ui/Header";
import { LoadingOverlayProvider } from "../global/OverlayContext";
import { Toaster } from "@/src/lib/components/ui/toaster";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoadingOverlayProvider>
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 h-full overflow-auto">{children ?? <div className="h-full" />}</main>
      </div>
      <Toaster />
    </LoadingOverlayProvider>
  );
}
