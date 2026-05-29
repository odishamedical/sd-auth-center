"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";
import * as Icons from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { roleData, loadingRole, isSuperAdmin } = useRole();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!authLoading && !loadingRole) {
      if (!user) {
        router.push("/");
      } else if (!roleData) {
        // Strictly reject unauthorized users (no role document)
        router.push("/launcher?error=unauthorized");
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, roleData, loadingRole, router]);

  if (authLoading || loadingRole || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020610]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-mono tracking-widest uppercase">Verifying Clearance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020610] text-[#E8F4FF] flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800/50 bg-[#060B14] flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800/50">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00D4FF] to-[#007BFF]">
            Control Tower
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">SD Ecosystem</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <a href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#00D4FF]/10 text-[#00D4FF] font-medium text-sm">
            <Icons.LayoutDashboard className="w-4 h-4" /> Dashboard
          </a>
          <a href="/admin/ads" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white font-medium text-sm transition-colors">
            <Icons.Megaphone className="w-4 h-4" /> Ad Manager
          </a>
          {isSuperAdmin && (
            <>
              <a href="/admin/whatsapp" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white font-medium text-sm transition-colors">
                <Icons.MessageCircle className="w-4 h-4" /> WhatsApp API
              </a>
              <a href="/admin/audit" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white font-medium text-sm transition-colors">
                <Icons.ShieldAlert className="w-4 h-4" /> Audit Logs
              </a>
            </>
          )}
          
          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Navigation</p>
          </div>
          <a href="/launcher" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white font-medium text-sm transition-colors">
            <Icons.Grid className="w-4 h-4" /> App Launcher
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <Icons.User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user?.email}</p>
              <p className="text-[10px] text-green-400 capitalize">{roleData?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-800/50 bg-[#060B14]/80 backdrop-blur flex items-center px-6 justify-between md:justify-end shrink-0">
          <div className="md:hidden flex items-center gap-2 font-bold">
            <Icons.Menu className="w-5 h-5 text-slate-400" /> Control Tower
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Systems Online
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
