import { NavLink, useParams } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ScrollText,
  Swords,
  History,
  ArrowUpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  UserPlus,
} from "lucide-react";
import { t } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { useState } from "react";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-sidebar-active text-text-primary"
      : "text-text-secondary hover:bg-sidebar-hover hover:text-text-primary",
  );

export function Sidebar() {
  const { signOut } = useAuth();
  const { characterId } = useParams();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "flex flex-col border-r border-border-primary bg-sidebar-bg transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border-primary px-4 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-white font-bold text-sm">
          WH
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-text-primary truncate">{t("appName")}</h1>
            <p className="text-[10px] text-text-muted truncate">{t("appSubtitle")}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={18} className="shrink-0" />
          {!collapsed && <span>{t("navDashboard")}</span>}
        </NavLink>

        <NavLink to="/characters/new" className={navLinkClass}>
          <UserPlus size={18} className="shrink-0" />
          {!collapsed && <span>{t("createCharacter")}</span>}
        </NavLink>

        {characterId && (
          <>
            <div className={clsx("px-3 pt-4 pb-1", collapsed && "hidden")}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {t("navCharacterSheet")}
              </p>
            </div>

            <NavLink to={`/characters/${characterId}`} end className={navLinkClass}>
              <User size={18} className="shrink-0" />
              {!collapsed && <span>{t("navCharacterSheet")}</span>}
            </NavLink>

            <NavLink to={`/characters/${characterId}/skills`} className={navLinkClass}>
              <ScrollText size={18} className="shrink-0" />
              {!collapsed && <span>{t("navSkills")}</span>}
            </NavLink>

            <NavLink to={`/characters/${characterId}/combat`} className={navLinkClass}>
              <Swords size={18} className="shrink-0" />
              {!collapsed && <span>{t("navCombat")}</span>}
            </NavLink>

            <NavLink to={`/characters/${characterId}/level-up`} className={navLinkClass}>
              <ArrowUpCircle size={18} className="shrink-0" />
              {!collapsed && <span>{t("navLevelUp")}</span>}
            </NavLink>

            <NavLink to={`/characters/${characterId}/history`} className={navLinkClass}>
              <History size={18} className="shrink-0" />
              {!collapsed && <span>{t("navHistory")}</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border-primary px-2 py-3 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-sidebar-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Einklappen</span>}
        </button>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-sidebar-hover hover:text-accent-danger transition-colors cursor-pointer"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t("signOut")}</span>}
        </button>
      </div>
    </aside>
  );
}
