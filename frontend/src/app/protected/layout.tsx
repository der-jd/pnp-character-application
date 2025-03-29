"use client";

import Header from "@/components/Header";
import { ToastProvider } from "../global/Notifications/notificationContext";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToastProvider>
        <Header />
        <main>{children}</main>
      </ToastProvider>
    </>
  );
}
