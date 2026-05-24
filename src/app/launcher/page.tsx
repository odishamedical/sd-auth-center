"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth, db, signOut, onAuthStateChanged } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';

export default function Launcher() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);

  // Admin Delegation Form State
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [selectedProject, setSelectedProject] = useState("Gold Hub");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [delegationLoading, setDelegationLoading] = useState(false);

  // UI Interactive States
  const [activeChartTab, setActiveChartTab] = useState<"sales" | "users">("sales");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, label: string, val: string } | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "delegations" | "systems">("overview");

  useEffect(() => {
    const localRole = localStorage.getItem("sd_current_user_role");
    if (localRole === "user") {
      router.push("/profile");
      return;
    }

    setUserEmail(localStorage.getItem("sd_current_user_email"));
    setUserName(localStorage.getItem("sd_current_user_name"));
    setUserAvatar(localStorage.getItem("sd_current_user_avatar"));
    setUserRole(localRole || "user");
    setUserUid(localStorage.getItem("sd_current_user_uid"));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        let role = "user";
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.role) role = data.role;
          }
          
          if (user.email?.includes("shyamdash") || user.email?.includes("odishamedical") || user.email?.includes("admin")) {
            role = "super_admin";
          }
        } catch (err) {
          console.warn("Launcher role fetch error, using fallback", err);
          if (user.email?.includes("shyamdash") || user.email?.includes("odishamedical") || user.email?.includes("admin")) {
            role = "super_admin";
          }
        }

        const finalName = user.displayName || user.email?.split("@")[0] || "User";
        const finalAvatar = user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

        localStorage.setItem("sd_current_user_email", user.email || "");
        localStorage.setItem("sd_current_user_name", finalName);
        localStorage.setItem("sd_current_user_avatar", finalAvatar);
        localStorage.setItem("sd_current_user_role", role);
        localStorage.setItem("sd_current_user_uid", user.uid);

        if (role === "user") {
          router.push("/profile");
          return;
        }

        setUserEmail(user.email);
        setUserName(finalName);
        setUserAvatar(finalAvatar);
        setUserRole(role);
        setUserUid(user.uid);

        try {
          const q = query(collection(db, "users"), where("referredBy", "==", user.uid));
          const snapshot = await getDocs(q);
          setReferralCount(snapshot.size);
        } catch (e) {
          console.error("Failed to fetch referral count", e);
        }

      } else {
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out from your Sovereign Gmail session?")) {
      try { await signOut(auth); } catch (e) { console.error(e); }
      localStorage.removeItem("sd_current_user_email");
      localStorage.removeItem("sd_current_user_name");
      localStorage.removeItem("sd_current_user_avatar");
      localStorage.removeItem("sd_current_user_role");
      localStorage.removeItem("sd_current_user_uid");
      router.push('/');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim()) {
      alert("Please fill out all fields.");
      return;
    }
    setDelegationLoading(true);
    try {
      const docId = newAdminEmail.trim().replace(/\./g, "_");
      await setDoc(doc(db, "role_delegations", docId), {
        email: newAdminEmail.trim(),
        name: newAdminName.trim(),
        project: selectedProject,
        role: selectedRole,
        assignedAt: new Date().toISOString(),
        assignedBy: userEmail
      });
      alert(`Delegated ${selectedRole} permissions for ${newAdminEmail} on ${selectedProject} successfully!`);
      setNewAdminEmail("");
      setNewAdminName("");
    } catch (err) {
      console.error("Delegation failed", err);
      alert("Role delegation failed. Make sure you are logged in as Super Admin.");
    } finally {
      setDelegationLoading(false);
    }
  };

  const getSsoParams = () => {
    if (!userEmail) return "?token=sd_user_sso_token";
    const params = new URLSearchParams({
      sso_email: userEmail,
      sso_name: userName || userEmail.split("@")[0],
      sso_avatar: userAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
      sso_role: userRole || "user",
      token: userRole === 'super_admin' ? 'sd_super_admin_secret_token' : 'sd_user_sso_token'
    });
    return `?${params.toString()}`;
  };

  const getProjectUrl = (baseUrl: string, adminPath: string) => {
    return `${baseUrl}${adminPath}${getSsoParams()}`;
  };

  const projects = [
    { name: "Gold Hub", url: "https://sd-gold-hub.vercel.app", adminPath: "/admin", icon: "💛", desc: "Gold Jewelry Marketplace & Vault Controls" },
    { name: "Sambalpuri Hub", url: "https://sd-bhulia-hub.vercel.app", adminPath: "/franchise/dashboard", icon: "🧵", desc: "Heritage Textiles, Weavers, & Escrow Ledger" },
    { name: "Telemedicine", url: "https://sd-dehapa-hub.vercel.app", adminPath: "/portal", icon: "🏥", desc: "Patient Portal & Diagnostic Pipelines" },
    { name: "News", url: "https://sd-news-hub.vercel.app", adminPath: "/admin", icon: "📰", desc: "Localized Media & Reporter Credentials" },
    { name: "Directory", url: "https://sd-directory.vercel.app", adminPath: "/admin", icon: "🧭", desc: "Artisan Listings Index & Store Claims" },
    { name: "IT Service", url: "https://sd-it-hub-w3sk.vercel.app", adminPath: "/admin", icon: "💻", desc: "Ecosystem SaaS Nodes & Hosting Uptime" }
  ];

  return (
    <div className="min-h-screen bg-[#040815] flex flex-col font-sans text-white relative overflow-hidden">
      
      {/* Background Sweeping Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05]">
        <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="#C5A059" strokeWidth="0.2" />
          <path d="M0,80 Q30,100 60,80 T100,90" fill="none" stroke="#C5A059" strokeWidth="0.2" />
          <path d="M0,20 Q40,0 70,30 T100,10" fill="none" stroke="#C5A059" strokeWidth="0.15" />
        </svg>
      </div>
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#C5A059]/5 rounded-full blur-[150px] z-0" />
      
      {/* Global Header */}
      <header className="h-[56px] border-b border-[#C5A059]/20 bg-[#090F1D]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#FFE082] via-[#C5A059] to-[#996515] p-[1px] flex-shrink-0">
            <div className="w-full h-full bg-[#060c18] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-black tracking-[0.2em] uppercase font-mono text-[#C5A059]">SD ECOSYSTEM</h1>
            <span className="text-[9px] font-extrabold bg-[#C5A059]/20 text-[#C5A059] px-1.5 py-0.5 rounded border border-[#C5A059]/30 uppercase tracking-widest font-mono">
              Command Center
            </span>
          </div>
        </div>

        {/* User Auth Profile */}
        <div className="flex items-center gap-3">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-[#C5A059]" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#C5A059] text-[#0A0F1E] flex items-center justify-center font-bold text-xs font-mono">
              {userName ? userName.charAt(0).toUpperCase() : "A"}
            </div>
          )}
          <div className="flex flex-col hidden sm:flex leading-none">
            <span className="text-xs font-bold text-white">{userName || userEmail?.split("@")[0] || "User"}</span>
            <span className="text-[9px] text-[#C5A059] tracking-wider uppercase font-mono mt-0.5">{userRole}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="text-[10px] text-red-400 hover:text-red-300 font-mono font-bold uppercase tracking-wider bg-red-950/20 border border-red-500/20 px-2.5 py-1 rounded cursor-pointer transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* Left Panel - Administrative Controls */}
        <aside className="w-full lg:w-80 bg-[#090F1D]/80 border-r border-[#C5A059]/20 p-6 flex flex-col justify-between shrink-0 backdrop-blur-xl z-20">
          <div className="space-y-6">
            
            {/* Sidebar Navigation Options */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-3">Ecosystem Console</span>
              
              <button 
                onClick={() => setActiveSection("overview")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeSection === "overview" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Overview & Charts
              </button>
              
              <button 
                onClick={() => setActiveSection("delegations")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeSection === "delegations" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Role Delegation
              </button>
            </div>

            {/* Admin Delegation Form */}
            <div className="bg-[#040815]/80 border border-[#C5A059]/30 rounded-2xl p-5 space-y-4 shadow-xl">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-[#C5A059] tracking-wider mb-1">Add Project Admin</h3>
                <p className="text-[10px] text-gray-400 leading-tight">Delegate dashboard management authority directly.</p>
              </div>

              <form onSubmit={handleAddAdmin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Select Project</label>
                  <select 
                    value={selectedProject} 
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-slate-800 rounded-lg text-xs p-2 text-[#C5A059] font-bold focus:outline-none focus:border-[#C5A059]"
                  >
                    {projects.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Assign Role</label>
                  <select 
                    value={selectedRole} 
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-slate-800 rounded-lg text-xs p-2 text-[#C5A059] font-bold focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="admin">Administrator</option>
                    <option value="moderator">Staff / Moderator</option>
                    <option value="super_admin">Global Super Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter full name"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-slate-800 rounded-lg text-xs p-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="admin@shyamdash.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-slate-800 rounded-lg text-xs p-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={delegationLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-[#996515] to-[#C5A059] text-[#0A1021] font-black text-[10px] uppercase tracking-wider rounded-xl shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {delegationLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Grant Admin Access</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>

          {/* Infrastructure Health Status */}
          <div className="pt-6 border-t border-[#C5A059]/20 hidden lg:block">
            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold block mb-2">Ecosystem Health</span>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between text-gray-300">
                <span>SSO Identity Hub</span>
                <span className="text-green-500 font-bold flex items-center gap-1">🟢 99.98%</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>IT SaaS Host Nodes</span>
                <span className="text-green-500 font-bold flex items-center gap-1">🟢 Online</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Body - Analytics Dashboard & Feeds */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-56px)]">
          
          {/* Header Title Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black text-white font-serif tracking-wide">
                Ecosystem <span className="text-gold-gradient">Command Center</span>
              </h2>
              <p className="text-xs text-gray-400">Consolidated analytics and remote administration across all 6 projects.</p>
            </div>

            {/* Quick Stats Summary */}
            <div className="flex flex-wrap gap-3">
              <span className="text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059]">
                Live Gold Rate: ₹7,138.50
              </span>
            </div>
          </div>

          {/* Quick Launcher Shortcuts */}
          <section className="space-y-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Quick Launch Gateways</span>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {projects.map((p) => (
                <a 
                  key={p.name}
                  href={getProjectUrl(p.url, p.adminPath)}
                  className="bg-[#090F1D]/80 border border-[#C5A059]/20 hover:border-[#C5A059] p-3.5 rounded-2xl text-center group transition-all hover:-translate-y-0.5 shadow-lg flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
                  <div className="leading-tight">
                    <span className="text-[10px] font-bold text-white block group-hover:text-[#C5A059] transition-colors">{p.name}</span>
                    <span className="text-[8px] text-[#C5A059] uppercase tracking-widest font-mono font-bold block mt-0.5">Admin →</span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Aggregated Ecosystem Metrics */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat 1 */}
            <div className="bg-[#090F1D]/60 border border-slate-800 hover:border-[#C5A059]/40 p-5 rounded-2xl flex items-center gap-4 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-xl shrink-0">
                💼
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Ecosystem Gross Sales</span>
                <strong className="text-lg md:text-xl font-bold text-[#C5A059] block mt-0.5">₹18,42,900</strong>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-[#090F1D]/60 border border-slate-800 hover:border-[#C5A059]/40 p-5 rounded-2xl flex items-center gap-4 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-xl shrink-0">
                👥
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Ecosystem SSO Users</span>
                <strong className="text-lg md:text-xl font-bold text-white block mt-0.5">14,281</strong>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-[#090F1D]/60 border border-slate-800 hover:border-[#C5A059]/40 p-5 rounded-2xl flex items-center gap-4 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-xl shrink-0">
                🧵
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Active Weavers & Stores</span>
                <strong className="text-lg md:text-xl font-bold text-white block mt-0.5">1,894</strong>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="bg-[#090F1D]/60 border border-slate-800 hover:border-[#C5A059]/40 p-5 rounded-2xl flex items-center gap-4 transition-all shadow-md">
              <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-xl shrink-0">
                📶
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">SSO Node Response</span>
                <strong className="text-lg md:text-xl font-bold text-green-500 block mt-0.5">99.98%</strong>
              </div>
            </div>

          </section>

          {/* Interactive Graph Section */}
          <section className="bg-[#090F1D]/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Ecosystem Performance Graph</h3>
                <p className="text-[10px] text-gray-400">Multi-hub trends for transactions and account creations.</p>
              </div>

              {/* Chart Tabs */}
              <div className="flex border border-slate-800 rounded-xl overflow-hidden p-0.5 bg-[#040815]">
                <button 
                  onClick={() => setActiveChartTab("sales")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    activeChartTab === "sales" 
                      ? "bg-gradient-to-r from-[#996515] to-[#C5A059] text-slate-900" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Sales Revenue
                </button>
                <button 
                  onClick={() => setActiveChartTab("users")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    activeChartTab === "users" 
                      ? "bg-gradient-to-r from-[#996515] to-[#C5A059] text-slate-900" 
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  SSO Sign-ups
                </button>
              </div>
            </div>

            {/* Glowing Neon Chart rendering */}
            <div className="w-full h-64 relative bg-[#040815]/50 border border-slate-900 rounded-2xl p-4 overflow-hidden flex items-end justify-between">
              
              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div 
                  className="absolute bg-[#090F1D] border border-[#C5A059]/60 rounded-xl p-2.5 shadow-2xl z-30 pointer-events-none text-left"
                  style={{ left: hoveredPoint.x - 60, bottom: hoveredPoint.y + 15 }}
                >
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest font-mono block">{hoveredPoint.label}</span>
                  <span className="text-xs font-black text-[#C5A059] block mt-0.5">{hoveredPoint.val}</span>
                </div>
              )}

              {/* SVG Charts drawing */}
              <svg className="absolute inset-0 w-full h-full p-6" viewBox="0 0 500 200" preserveAspectRatio="none">
                {activeChartTab === "sales" ? (
                  <>
                    {/* Gold Hub Sales Line (Gold) */}
                    <path 
                      d="M 50,160 L 150,140 L 250,110 L 350,80 L 450,30" 
                      fill="none" 
                      stroke="#C5A059" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px rgba(197,160,89,0.5))"
                    />
                    {/* Sambalpuri Hub Sales Line (Cyan/Teal) */}
                    <path 
                      d="M 50,175 L 150,155 L 250,140 L 350,115 L 450,85" 
                      fill="none" 
                      stroke="#06B6D4" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px rgba(6,182,212,0.5))"
                    />
                    
                    {/* Interaction Circles */}
                    <circle cx="50" cy="160" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 50, y: 40, label: "Jan (Gold Hub)", val: "₹1,20,000" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="150" cy="140" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 150, y: 60, label: "Feb (Gold Hub)", val: "₹1,50,000" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="250" cy="110" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 250, y: 90, label: "Mar (Gold Hub)", val: "₹1,90,000" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="350" cy="80" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 350, y: 120, label: "Apr (Gold Hub)", val: "₹2,40,000" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="450" cy="30" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 430, y: 170, label: "May (Gold Hub)", val: "₹3,10,000" })} onMouseLeave={() => setHoveredPoint(null)} />

                    <circle cx="450" cy="85" r="5" fill="#06B6D4" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 430, y: 115, label: "May (Sambalpuri)", val: "₹2,20,000" })} onMouseLeave={() => setHoveredPoint(null)} />
                  </>
                ) : (
                  <>
                    {/* SSO Users Signups (Gold) */}
                    <path 
                      d="M 50,180 L 150,165 L 250,140 L 350,105 L 450,55" 
                      fill="none" 
                      stroke="#C5A059" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      filter="drop-shadow(0 0 6px rgba(197,160,89,0.5))"
                    />
                    
                    <circle cx="50" cy="180" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 50, y: 20, label: "Jan (Active Users)", val: "2,100" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="150" cy="165" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 150, y: 35, label: "Feb (Active Users)", val: "3,500" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="250" cy="140" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 250, y: 60, label: "Mar (Active Users)", val: "5,800" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="350" cy="105" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 350, y: 95, label: "Apr (Active Users)", val: "9,200" })} onMouseLeave={() => setHoveredPoint(null)} />
                    <circle cx="450" cy="55" r="5" fill="#C5A059" className="cursor-pointer" onMouseEnter={() => setHoveredPoint({ x: 430, y: 145, label: "May (Active Users)", val: "14,281" })} onMouseLeave={() => setHoveredPoint(null)} />
                  </>
                )}
              </svg>

              {/* Monthly X-Axis Labels */}
              <div className="w-full flex justify-between px-6 text-[9px] text-gray-500 font-mono font-bold z-10 select-none pointer-events-none">
                <span>JAN</span>
                <span>FEB</span>
                <span>MAR</span>
                <span>APR</span>
                <span>MAY</span>
              </div>
            </div>

            {/* Graph Legend */}
            {activeChartTab === "sales" && (
              <div className="flex gap-4 justify-center mt-3 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-1.5 rounded-full bg-[#C5A059]" /> Gold Hub Sales
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-1.5 rounded-full bg-[#06B6D4]" /> Sambalpuri Hub Sales
                </span>
              </div>
            )}
          </section>

          {/* Split Ledgers / Activity Log */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sales Log Column */}
            <div className="bg-[#090F1D]/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#C5A059]">Consolidated Sales Ledger</h3>
                <p className="text-[10px] text-gray-400">Recent transactions occurring across payment escrows.</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {[
                  { hub: "Gold Hub", item: "Diamond Bridal Necklace", value: "₹2,45,000", time: "10 mins ago", color: "text-[#C5A059]", icon: "💍" },
                  { hub: "Sambalpuri Hub", item: "Mulberry Silk Double Ikat Pata Saree", value: "₹14,899", time: "28 mins ago", color: "text-green-400", icon: "🧵" },
                  { hub: "IT Service", item: "Enterprise Hosting Plan - Renewal", value: "₹4,999", time: "1 hr ago", color: "text-cyan-400", icon: "💻" },
                  { hub: "Gold Hub", item: "22K Solid Gold Bangles (22gm)", value: "₹1,56,400", time: "2 hrs ago", color: "text-[#C5A059]", icon: "💍" },
                  { hub: "Sambalpuri Hub", item: "Traditional Handspun Cotton Saree", value: "₹4,899", time: "4 hrs ago", color: "text-green-400", icon: "🧵" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-[#040815]/60 border border-slate-900 rounded-xl hover:border-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div className="leading-tight">
                        <span className="text-xs font-bold text-white block truncate max-w-[180px]">{item.item}</span>
                        <span className={`text-[8px] font-mono uppercase tracking-wider font-extrabold ${item.color}`}>{item.hub}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#C5A059] block">{item.value}</span>
                      <span className="text-[8px] text-gray-500 font-mono block mt-0.5">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Activity Feed Column */}
            <div className="bg-[#090F1D]/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">Ecosystem Activity Log</h3>
                <p className="text-[10px] text-gray-400">Live remote operations logged via Auth SSO authentication.</p>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {[
                  { tag: "AUTH", detail: "Admin Shyam Dash delegated 'admin' role to weaver@bhulia.com.", time: "12m ago", style: "bg-[#C5A059]/20 text-[#C5A059] border-[#C5A059]/30" },
                  { tag: "SSO", detail: "Super Admin (odishamedical@gmail.com) initiated remote jump to DehaPa portal.", time: "45m ago", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                  { tag: "INDEX", detail: "Artisan Boutique (Bargarh Handlooms) claimed directory listing.", time: "2h ago", style: "bg-green-500/10 text-green-400 border-green-500/20" },
                  { tag: "DEPLOY", detail: "IT node 'sd-gold-hub-vercel' trigger build successfully.", time: "4h ago", style: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                  { tag: "ALERT", detail: "Unusual role check bypassed: local auth disabled on Directory Hub.", time: "5h ago", style: "bg-red-500/10 text-red-400 border-red-500/20" }
                ].map((log, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 p-3 bg-[#040815]/60 border border-slate-900 rounded-xl text-left text-[11px] leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 mt-0.5 ${log.style}`}>
                        {log.tag}
                      </span>
                      <span className="text-gray-300">{log.detail}</span>
                    </div>
                    <span className="text-[8px] text-gray-500 font-mono shrink-0 mt-0.5">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </main>
      </div>

    </div>
  );
}
