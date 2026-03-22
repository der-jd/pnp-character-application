import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
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
  CalendarPlus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/i18n";
import { useAuth } from "@/auth/AuthProvider";
import { fetchCharacters } from "@/api/characters";
import { useState } from "react";
import type { CharacterShort } from "api-spec";
import { EventDialog } from "@/components/EventDialog";

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
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);

  const { data } = useQuery({ queryKey: ["characters"], queryFn: fetchCharacters });
  const characters = (data?.characters ?? []) as CharacterShort[];

  function handleCharacterSwitch(newId: string) {
    if (!newId) return;
    if (characterId) {
      const suffix = location.pathname.split(`/characters/${characterId}`)[1] ?? "";
      navigate(`/characters/${newId}${suffix}`);
    } else {
      navigate(`/characters/${newId}`);
    }
  }

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

        {characters.length > 0 && !collapsed && (
          <div className="px-3 pt-3 pb-1">
            <select
              value={characterId ?? ""}
              onChange={(e) => handleCharacterSwitch(e.target.value)}
              className="w-full rounded-md border border-border-primary bg-bg-secondary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus appearance-none cursor-pointer"
            >
              {!characterId && (
                <option value="" disabled>
                  {t("selectCharacter")}
                </option>
              )}
              {characters.map((char) => (
                <option key={char.characterId} value={char.characterId}>
                  {char.name} (Level {char.level})
                </option>
              ))}
            </select>
          </div>
        )}

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

            <button
              onClick={() => setEventDialogOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-text-secondary hover:bg-sidebar-hover hover:text-text-primary cursor-pointer"
            >
              <CalendarPlus size={18} className="shrink-0" />
              {!collapsed && <span>{t("navEvent")}</span>}
            </button>

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
      {characterId && (
        <EventDialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} characterId={characterId} />
      )}
    </aside>
  );
}
