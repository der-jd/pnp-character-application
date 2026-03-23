import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { setTokenGetter } from "@/api/client";
import { ToastProvider } from "@/components/ui/Toast";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { SignInPage } from "@/pages/SignInPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { CharacterSheetPage } from "@/pages/CharacterSheetPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { CombatPage } from "@/pages/CombatPage";
import { LevelUpPage } from "@/pages/LevelUpPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { CharacterCreatePage } from "@/pages/CharacterCreatePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  const { idToken } = useAuth();

  useEffect(() => {
    setTokenGetter(() => idToken);
  }, [idToken]);

  return (
    <ToastProvider>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <SignInPage />
            </PublicOnlyRoute>
          }
        />

        {/* Protected */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/characters/new" element={<CharacterCreatePage />} />
          <Route path="/characters/:characterId" element={<CharacterSheetPage />} />
          <Route path="/characters/:characterId/skills" element={<SkillsPage />} />
          <Route path="/characters/:characterId/combat" element={<CombatPage />} />
          <Route path="/characters/:characterId/level-up" element={<LevelUpPage />} />
          <Route path="/characters/:characterId/history" element={<HistoryPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}
