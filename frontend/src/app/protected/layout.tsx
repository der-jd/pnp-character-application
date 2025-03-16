"use client";

import Header from "@lib/components/ui/Header";
import SidebarRight from "@/src/lib/components/Sidebar/SidebarRight";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex">
        <div className="flex-1 bg-grey-200"><SidebarRight/></div>
        <main className="flex-2 p-6">{children}</main>
        <div className="flex-1 bg-grey-200">TEST</div>
      </div>
    </div>
  );
}
