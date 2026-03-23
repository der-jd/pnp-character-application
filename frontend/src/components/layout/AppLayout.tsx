import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useTheme } from "@/hooks/useTheme";

export function AppLayout() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="relative w-full h-52 overflow-hidden">
          <img src="/banner.png" alt="World Hoppers" className="w-full h-full object-cover object-center" />
          {/* Fade bottom into page background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-primary" />
          {/* Subtle side fades */}
          {isDark && (
            <>
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bg-primary/60 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bg-primary/60 to-transparent" />
            </>
          )}
        </div>
        <div className="mx-auto max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
