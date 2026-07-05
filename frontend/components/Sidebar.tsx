"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  PlaySquare, 
  Database, 
  History, 
  LogOut,
  Sparkles,
  Settings2,
  ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { clsx } from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Amazon Scraper", href: "/scraper", icon: PlaySquare },
    { name: "Products DB", href: "/products", icon: Database },
    { name: "Jobs History", href: "/history", icon: History },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="w-64 min-h-screen glass-card border-r border-slate-800 flex flex-col justify-between p-6">
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 leading-tight">
              Amazon Research
            </h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Data Automation</p>
          </div>
        </div>

        {/* Navigation Section Label */}
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-3">
          Navigation
        </p>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/25 shadow-sm shadow-blue-500/10" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent"
                )}
              >
                <Icon className={clsx("w-4 h-4 flex-shrink-0", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Settings Section */}
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-3 mt-8">
          Account
        </p>
        <nav>
          <Link
            href="/settings"
            className={clsx(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              pathname === "/settings"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/25"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent"
            )}
          >
            <Settings2 className={clsx("w-4 h-4 flex-shrink-0", pathname === "/settings" ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
            <span className="flex-1">Settings</span>
            {pathname === "/settings" && <ChevronRight className="w-3.5 h-3.5 text-blue-500/70" />}
          </Link>
        </nav>
      </div>

      {/* User Session Footer */}
      <div className="border-t border-slate-800/60 pt-5">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-slate-200">
              {user?.email || "User Account"}
            </p>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {user?.role || "standard"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
