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
        <div className="flex flex-1 h-full min-h-0">
          <div className="w-1/5 h-full border-r">
            <SidebarLeft content={sidebarLeftContent} />
          </div>
          <main className="w-3/5 h-full p-6 border-x min-h-[1px]">{children ?? <div className="h-full" />}</main>
          <div className="w-1/5 h-full border-l">
            <SidebarRight content={sidebarRightContent} />
          </div>
        </div>
      </div>
      <Toaster />
    </LoadingOverlayProvider>
  );
}

const getSidebarLeftContent = (pathname: string) => {
  if (pathname.startsWith("/protected/talente") || pathname.startsWith("/protected/kampftalente")) {
    return <SkillHistoryContent />;
  }
};

const getSidebarRightContent = (pathname: string) => {
  if (pathname.startsWith("/protected/talente") || pathname.startsWith("/protected/kampftalente")) {
    return <CharacterInfoContent />;
  }
};
