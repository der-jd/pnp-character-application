"use client";

import Header from "@lib/components/ui/Header";
import SidebarRight from "@/src/lib/components/Sidebar/SidebarRight";
import { LoadingOverlayProvider } from "../global/OverlayContext";
import { Toaster } from "@/src/lib/components/ui/toaster";
import SidebarLeft from "@/src/lib/components/Sidebar/SidebarLeft";
import { usePathname } from "next/navigation";

import SkillHistoryContent from "@/src/lib/components/Sidebar/content/skillsContent";
import CharacterInfoContent from "@/src/lib/components/Sidebar/content/charInfoContent";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarLeftContent = getSidebarLeftContent(pathname);
  const sidebarRightContent = getSidebarRightContent(pathname);

  return (
    <LoadingOverlayProvider>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex">
          <div className="flex-1">
            <SidebarRight content={sidebarRightContent} />
          </div>
          <main className="flex-2 p-6">{children}</main>
          <div className="flex-1">
            <SidebarLeft content={sidebarLeftContent} />
          </div>
        </div>
      </div>
      <Toaster />
    </LoadingOverlayProvider>
  );
}

const getSidebarLeftContent = (pathname: string) => {
  if (pathname.startsWith("/protected/talente")) {
    return <SkillHistoryContent />;
  }
};

const getSidebarRightContent = (pathname: string) => {
  if (pathname.startsWith("/protected/talente")) {
    return <CharacterInfoContent />;
  }
};
