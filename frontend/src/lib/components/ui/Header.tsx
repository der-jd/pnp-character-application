"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@lib/components/ui/button";
import { useAuth, useAuthState } from "@/src/app/global/AuthContext";
import { LogOut } from "lucide-react";
import "@global/styles/globals.css";

export default function Header() {
  const auth = useAuth();
  const { user } = useAuthState();
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut();
    router.push("/");
  };

  return (
    <header className="p-4 w-full bg-gray-200">
      <div className="container max-w-5xl mx-auto flex justify-between items-center px-4">
        {/* Navigation */}
        <nav className="relative">
          <ul className="flex space-x-4 items-center">
            <li>
              <Link href="/protected/dashboard">
                <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">Dashboard</Button>
              </Link>
            </li>
            <li>
              <Link href="/protected/talente">
                <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">Skills</Button>
              </Link>
            </li>
            <li>
              <Link href="/protected/kampftalente">
                <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
                  Combat Skills
                </Button>
              </Link>
            </li>
            <li>
              <Link href="/protected/inventar">
                <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">Inventory</Button>
              </Link>
            </li>
            <li>
              <Link href="/protected/history">
                <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">History</Button>
              </Link>
            </li>
          </ul>
        </nav>

        {/* User info and logout button */}
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-sm text-gray-700">
              {user.email}
            </span>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="bg-red-600 text-white hover:bg-red-700 hover:text-white px-4 py-2 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
