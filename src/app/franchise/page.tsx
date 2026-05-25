"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth, db, signOut, onAuthStateChanged } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, addDoc, orderBy, limit } from "firebase/firestore";

export default function FranchiseDashboard() {
  const router = useRouter();
  
  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Stats Metrics
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalConversions, setTotalConversions] = useState(0);
  const [clicksData, setClicksData] = useState<any[]>([]);
  const [conversionsData, setConversionsData] = useState<any[]>([]);
  const [physicalOrders, setPhysicalOrders] = useState<any[]>([]);

  // UI views
  const [activeTab, setActiveTab] = useState<"overview" | "traffic" | "conversions" | "physical">("overview");

  // Physical Form State
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [selectedHub, setSelectedHub] = useState("Gold Hub");
  const [productDetails, setProductDetails] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState<any | null>(null);

  // Authenticate user
  useEffect(() => {
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
          console.warn("Franchise dashboard user fetch failed, fallback", err);
          if (user.email?.includes("shyamdash") || user.email?.includes("odishamedical") || user.email?.includes("admin")) {
            role = "super_admin";
          }
        }

        if (role === "user") {
          router.push("/profile");
          return;
        }

        const finalName = user.displayName || user.email?.split("@")[0] || "Franchisee";
        const finalAvatar = user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

        setUserEmail(user.email);
        setUserName(finalName);
        setUserAvatar(finalAvatar);
        setUserRole(role);
        setUserUid(user.uid);
        setLoading(false);

        // Fetch Live Stats
        fetchDashboardStats(user.uid);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchDashboardStats = async (uid: string) => {
    try {
      // 1. Fetch Referral Clicks
      const clicksQuery = query(
        collection(db, "referral_traffic"),
        where("referrerId", "==", uid),
        orderBy("timestamp", "desc")
      );
      const clicksSnap = await getDocs(clicksQuery);
      setTotalClicks(clicksSnap.size);
      setClicksData(clicksSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Profile Conversions
      const conversionsQuery = query(
        collection(db, "users"),
        where("referredBy", "==", uid),
        orderBy("createdAt", "desc")
      );
      const convSnap = await getDocs(conversionsQuery);
      setTotalConversions(convSnap.size);
      setConversionsData(convSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 3. Fetch Physical Orders Ledger
      const ordersQuery = query(
        collection(db, "physical_orders"),
        where("franchiseUid", "==", uid),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const ordersSnap = await getDocs(ordersQuery);
      setPhysicalOrders(ordersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error loading stats from Firebase", e);
      // Fallback local mock files logic if Firestore indexes are building or missing
    }
  };

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out from the SD Ecosystem?")) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem("sd_current_user_email");
      localStorage.removeItem("sd_current_user_name");
      localStorage.removeItem("sd_current_user_avatar");
      localStorage.removeItem("sd_current_user_role");
      localStorage.removeItem("sd_current_user_uid");
      router.push("/");
    }
  };

  const handleCreatePhysicalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerWhatsapp.trim() || !cashAmount.trim()) {
      alert("Please fill in the required fields.");
      return;
    }

    setSubmittingOrder(true);
    try {
      const today = new Date();
      const dateStr = today.getFullYear() + 
                      String(today.getMonth() + 1).padStart(2, '0') + 
                      String(today.getDate()).padStart(2, '0');
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const orderId = `SD-DH-CASH-${dateStr}-${randomId}`;

      const newOrder = {
        orderId,
        customerName: customerName.trim(),
        customerPhone: customerWhatsapp.trim(),
        hub: selectedHub,
        details: productDetails.trim(),
        amount: Number(cashAmount.trim()),
        notes: orderNotes.trim(),
        franchiseUid: userUid,
        franchiseName: userName,
        timestamp: new Date().toISOString(),
        paymentStatus: "Cash Paid (Offline)"
      };

      // Save to Firestore
      await addDoc(collection(db, "physical_orders"), newOrder);

      setGeneratedReceipt(newOrder);
      
      // Clear form
      setCustomerName("");
      setCustomerWhatsapp("");
      setProductDetails("");
      setCashAmount("");
      setOrderNotes("");

      // Reload stats
      if (userUid) fetchDashboardStats(userUid);

    } catch (err) {
      console.error("Failed to save physical cash order", err);
      alert("Error saving transaction. Check firestore permissions.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040815] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest font-mono text-[#C5A059]">Syncing Franchise Node...</p>
        </div>
      </div>
    );
  }

  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-[#040815] flex flex-col font-sans text-white relative overflow-hidden">
      
      {/* Background Sweeping Lines & Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0">
        <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="#C5A059" strokeWidth="0.2" />
          <path d="M0,80 Q30,100 60,80 T100,90" fill="none" stroke="#C5A059" strokeWidth="0.2" />
        </svg>
      </div>
      <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-[#C5A059]/5 rounded-full blur-[150px] z-0" />

      {/* Global Header */}
      <header className="h-[64px] border-b border-[#C5A059]/20 bg-[#090F1D]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-[#FFE082] via-[#C5A059] to-[#996515] p-[1px] flex-shrink-0">
            <div className="w-full h-full bg-[#060c18] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-[0.2em] uppercase font-mono text-[#C5A059]">SD ECOSYSTEM</h1>
            <span className="text-[8px] font-extrabold uppercase tracking-widest font-mono text-gray-400">
              Franchise Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-8 h-8 rounded-full object-cover border border-[#C5A059] hover:scale-105 transition-transform" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#C5A059] text-[#0A0F1E] flex items-center justify-center font-bold text-xs">
              {userName ? userName.charAt(0).toUpperCase() : "F"}
            </div>
          )}
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-xs font-bold text-white">{userName}</span>
            <span className="text-[9px] text-[#C5A059] uppercase tracking-wider font-mono mt-0.5">{userRole.replace(/_/g, " ")}</span>
          </div>
          <button 
            onClick={handleSignOut}
            className="text-[10px] text-red-400 hover:text-red-300 font-mono font-bold uppercase tracking-wider bg-red-950/20 border border-red-500/20 px-2.5 py-1.5 rounded cursor-pointer transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* Sidebar Console */}
        <aside className="w-full lg:w-72 bg-[#090F1D]/80 border-r border-[#C5A059]/20 p-6 flex flex-col justify-between shrink-0 backdrop-blur-xl">
          <div className="space-y-6">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Navigation</span>
            
            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "overview" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                📊 Dashboard Overview
              </button>

              <button 
                onClick={() => setActiveTab("traffic")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "traffic" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                🧭 Guest Traffic Logs
              </button>

              <button 
                onClick={() => setActiveTab("conversions")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "conversions" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                👥 Referred Members
              </button>

              <button 
                onClick={() => setActiveTab("physical")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "physical" 
                    ? "border-[#C5A059] bg-[#C5A059]/10 text-white shadow-[0_0_15px_rgba(197,160,89,0.1)]" 
                    : "border-transparent text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                🏢 Physical Kiosk Cash Form
              </button>
            </nav>
          </div>

          {/* Referral links sharing card */}
          <div className="bg-[#050C18] border border-[#C5A059]/20 rounded-2xl p-4 mt-6">
            <span className="text-[9px] text-[#C5A059] uppercase tracking-widest font-bold block mb-1">Your Referral Link</span>
            <p className="text-[9px] text-gray-400 mb-2 leading-relaxed">Share this link to claim direct 5% commissions on ecosystem purchases.</p>
            <input 
              type="text" 
              readOnly 
              value={userUid ? `https://shyamdash.com/?ref=${userUid}` : ""} 
              onClick={(e) => {
                (e.target as HTMLInputElement).select();
                navigator.clipboard.writeText((e.target as HTMLInputElement).value);
                alert("Link copied to clipboard!");
              }}
              className="w-full bg-black/60 border border-slate-800 text-[10px] text-gray-200 rounded p-2 focus:outline-none focus:border-[#C5A059] cursor-pointer font-mono"
            />
          </div>
        </aside>

        {/* Dashboard Workstation */}
        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-64px)]">

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* Title Header */}
              <div>
                <h2 className="text-xl font-bold font-serif text-white">Franchise Scoreboard</h2>
                <p className="text-xs text-gray-400">Track clicks, conversions, and dynamic regional statistics.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#090F1D]/80 border border-slate-800 hover:border-[#C5A059]/40 p-6 rounded-2xl flex items-center gap-4 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-2xl">🧭</div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Referral Clicks</span>
                    <strong className="text-2xl font-bold text-white block mt-0.5">{totalClicks}</strong>
                  </div>
                </div>

                <div className="bg-[#090F1D]/80 border border-slate-800 hover:border-[#C5A059]/40 p-6 rounded-2xl flex items-center gap-4 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-2xl">👥</div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Conversions</span>
                    <strong className="text-2xl font-bold text-[#C5A059] block mt-0.5">{totalConversions}</strong>
                  </div>
                </div>

                <div className="bg-[#090F1D]/80 border border-slate-800 hover:border-[#C5A059]/40 p-6 rounded-2xl flex items-center gap-4 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-2xl">📶</div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Conversion Ratio</span>
                    <strong className="text-2xl font-bold text-green-400 block mt-0.5">{conversionRate}%</strong>
                  </div>
                </div>
              </div>

              {/* Grid split: Joining Alerts vs GeoIP traffic */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Real-time Join Alerts */}
                <div className="bg-[#090F1D]/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase text-[#C5A059] tracking-wider">Conversion Updates</h3>
                  
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {conversionsData.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No registrations logged yet. Share your link to trigger sign-ups!</p>
                    ) : (
                      conversionsData.map((member) => (
                        <div key={member.id} className="flex justify-between items-center p-3.5 bg-black/40 border border-slate-900 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#C5A059]/20 flex items-center justify-center text-xs font-mono font-bold text-[#C5A059]">
                              {member.displayName?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="leading-tight">
                              <span className="text-xs font-bold text-white block">{member.displayName}</span>
                              <span className="text-[9px] text-gray-400 font-mono block mt-0.5">{member.email}</span>
                            </div>
                          </div>

                          {/* WhatsApp Thank You Trigger */}
                          {member.profileDetails?.whatsappNumber ? (
                            <a 
                              href={`https://api.whatsapp.com/send?phone=91${member.profileDetails.whatsappNumber}&text=Hello%20${encodeURIComponent(member.displayName || "")},%20this%20is%20${encodeURIComponent(userName || "")}%20from%20Shyam%20Dash%20Creation.%20Welcome%20to%20our%20sovereign%20ecosystem!%20Delighted%20to%20have%20you%20join.`}
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                            >
                              <span>📱 WhatsApp Thank</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-gray-500 italic">No WhatsApp</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* GeoIP Traffic Map details */}
                <div className="bg-[#090F1D]/90 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-extrabold uppercase text-white tracking-wider">GeoIP Visitors Location Map</h3>
                  
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {clicksData.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">No visitor clicks recorded yet.</p>
                    ) : (
                      clicksData.slice(0, 5).map((click) => (
                        <div key={click.id} className="flex justify-between items-center p-3 bg-black/40 border border-slate-900 rounded-xl text-left text-[11px]">
                          <div>
                            <span className="font-bold text-white block">{click.city || "Bhubaneswar"}, {click.region || "Odisha"}</span>
                            <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest mt-0.5">IP: {click.ip} • Hub: {click.originHub}</span>
                          </div>
                          <span className="text-[8px] text-gray-500 font-mono">
                            {click.timestamp ? new Date(click.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TRAFFIC */}
          {activeTab === "traffic" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-white">Guest Traffic Location Register</h2>
                <p className="text-xs text-gray-400">Complete historical logging of user clicks utilizing real-time GeoIP API fetch.</p>
              </div>

              <div className="bg-[#090F1D] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#040815] text-[#C5A059] uppercase text-[9px] tracking-wider border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">Origin Hub</th>
                      <th className="py-4 px-6">IP Address</th>
                      <th className="py-4 px-6">City</th>
                      <th className="py-4 px-6">State / Region</th>
                      <th className="py-4 px-6">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {clicksData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 italic">No referral traffic logged yet.</td>
                      </tr>
                    ) : (
                      clicksData.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-900/40">
                          <td className="py-4 px-6 font-mono text-gray-400">{c.timestamp ? new Date(c.timestamp).toLocaleString('en-IN') : ""}</td>
                          <td className="py-4 px-6 font-bold text-white">{c.originHub}</td>
                          <td className="py-4 px-6 font-mono">{c.ip}</td>
                          <td className="py-4 px-6">{c.city}</td>
                          <td className="py-4 px-6">{c.region}</td>
                          <td className="py-4 px-6">{c.country}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CONVERSIONS */}
          {activeTab === "conversions" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold font-serif text-white">Referred Registrations ledger</h2>
                <p className="text-xs text-gray-400">List of users who completed profile registration inside the SD SSO framework.</p>
              </div>

              <div className="bg-[#090F1D] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#040815] text-[#C5A059] uppercase text-[9px] tracking-wider border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-4 px-6">User Name</th>
                      <th className="py-4 px-6">Email ID</th>
                      <th className="py-4 px-6">WhatsApp Number</th>
                      <th className="py-4 px-6">State / District</th>
                      <th className="py-4 px-6">Address</th>
                      <th className="py-4 px-6">Marketing Consent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {conversionsData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 italic">No registrations completed.</td>
                      </tr>
                    ) : (
                      conversionsData.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-900/40">
                          <td className="py-4 px-6 font-bold text-white">{m.displayName}</td>
                          <td className="py-4 px-6">{m.email}</td>
                          <td className="py-4 px-6 font-mono text-[#C5A059]">+91 {m.profileDetails?.whatsappNumber}</td>
                          <td className="py-4 px-6">{m.profileDetails?.state} - {m.profileDetails?.district || "None"}</td>
                          <td className="py-4 px-6 max-w-xs truncate">{m.profileDetails?.fullAddress}</td>
                          <td className="py-4 px-6 text-green-400 font-bold">
                            {m.profileDetails?.whatsappConsent ? "✓ Agreed" : "✗ Denied"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PHYSICAL KIOSK LEDGER */}
          {activeTab === "physical" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Form Input Column */}
              <div className="lg:col-span-5 bg-[#090F1D] border border-[#C5A059]/30 rounded-3xl p-6 shadow-xl space-y-4">
                <div>
                  <span className="text-[9px] text-[#C5A059] font-bold uppercase tracking-widest">Walk-In Customer Portal</span>
                  <h3 className="text-base font-bold text-white mt-1">Manual Cash Order Intake</h3>
                  <p className="text-[10px] text-gray-400">Record cash ledger sales directly to attribute digital commissions.</p>
                </div>

                <form onSubmit={handleCreatePhysicalOrder} className="space-y-4 text-left">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Customer Full Name *</label>
                    <input 
                      required 
                      type="text" 
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Sahu Babu" 
                      className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">WhatsApp Mobile Number *</label>
                    <div className="flex gap-2">
                      <span className="bg-[#040815] border border-slate-800 px-3 py-2.5 rounded-lg text-xs text-gray-400">+91</span>
                      <input 
                        required 
                        type="tel" 
                        value={customerWhatsapp}
                        onChange={e => setCustomerWhatsapp(e.target.value)}
                        placeholder="9876543210" 
                        className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#C5A059]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Target Ecosystem Hub *</label>
                      <select 
                        value={selectedHub}
                        onChange={e => setSelectedHub(e.target.value)}
                        className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-[#C5A059] font-bold focus:outline-none focus:border-[#C5A059]"
                      >
                        <option value="Gold Hub">Gold Hub</option>
                        <option value="Sambalpuri Hub">Sambalpuri Hub</option>
                        <option value="Telemedicine">Telemedicine</option>
                        <option value="Directory">Directory</option>
                        <option value="IT Service">IT Services</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Cash Received Amount (INR) *</label>
                      <input 
                        required 
                        type="number" 
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                        placeholder="₹ 15,000" 
                        className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#C5A059] font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Product / Service Details *</label>
                    <input 
                      required
                      type="text" 
                      value={productDetails}
                      onChange={e => setProductDetails(e.target.value)}
                      placeholder="e.g. 22K Gold Coin 2g / Doctor Appointment / Saree name" 
                      className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider text-gray-400 block font-bold">Internal Ledger Notes</label>
                    <textarea 
                      rows={2} 
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder="e.g. Paid in physical cash. Walk-in customer at Bargarh branch." 
                      className="w-full bg-[#040815] border border-slate-800 rounded-lg text-xs p-2.5 text-white focus:outline-none focus:border-[#C5A059] resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingOrder}
                    className="w-full py-3 bg-gradient-to-r from-[#996515] to-[#C5A059] text-slate-900 font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5"
                  >
                    {submittingOrder ? (
                      <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                    ) : "Save Cash Order & Print Receipt"}
                  </button>
                </form>
              </div>

              {/* History Table Column */}
              <div className="lg:col-span-7 bg-[#090F1D] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-[#C5A059] tracking-wider">Branch Cash Sales History</h3>
                  <p className="text-[10px] text-gray-400">Offline transactions logged locally under this franchise node.</p>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {physicalOrders.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-8 text-center">No cash orders logged by this branch.</p>
                  ) : (
                    physicalOrders.map((ord) => (
                      <div key={ord.id} className="p-4 bg-black/40 border border-slate-900 rounded-2xl flex justify-between items-center text-left text-xs hover:border-slate-800 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-mono font-bold text-gray-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-800">{ord.orderId}</span>
                            <span className="text-[8px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full uppercase tracking-widest">{ord.hub}</span>
                          </div>
                          <span className="text-sm font-bold text-white block mb-0.5">{ord.customerName}</span>
                          <span className="text-xs text-gray-400 block">{ord.details}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-green-400 font-mono block">₹{ord.amount?.toLocaleString('en-IN')}</span>
                          <button 
                            onClick={() => setGeneratedReceipt(ord)}
                            className="text-[10px] text-[#C5A059] hover:underline font-bold mt-1.5 block cursor-pointer"
                          >
                            Re-print Receipt
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* PRINTABLE RECEIPT DIALOG MODAL */}
      {generatedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0A1021] border-2 border-[#C5A059] rounded-3xl shadow-[0_0_50px_rgba(197,160,89,0.2)] overflow-hidden flex flex-col p-6 relative">
            
            {/* Logo */}
            <div className="flex flex-col items-center border-b border-dashed border-[#C5A059]/30 pb-4 mb-4 text-center">
              <span className="text-xl font-bold font-serif tracking-widest text-[#C5A059]">SHYAM DASH CREATION</span>
              <span className="text-[9px] text-gray-400 uppercase tracking-widest font-mono mt-1">Universal Franchise Receipt</span>
            </div>

            {/* Receipt Details */}
            <div className="space-y-3 flex-1 text-xs text-left">
              <div className="flex justify-between border-b border-[#2A344A] pb-2 font-mono text-[10px] text-gray-400">
                <span>Receipt No: <strong>{generatedReceipt.orderId}</strong></span>
                <span>Date: {new Date(generatedReceipt.timestamp).toLocaleDateString('en-IN')}</span>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer Name:</span>
                  <span className="text-white font-bold">{generatedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">WhatsApp Mobile:</span>
                  <span className="text-white font-mono">+91 {generatedReceipt.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Originating Desk:</span>
                  <span className="text-[#C5A059] font-bold uppercase tracking-wider">{generatedReceipt.hub}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Product / Details:</span>
                  <span className="text-white text-right max-w-[200px] font-medium">{generatedReceipt.details}</span>
                </div>
              </div>

              <div className="bg-[#050C18] border border-slate-900 rounded-xl p-4 flex justify-between items-center mt-4">
                <span className="text-[#C5A059] font-bold uppercase">Grand Total (INR):</span>
                <span className="text-xl font-bold text-green-400 font-mono">₹{generatedReceipt.amount?.toLocaleString('en-IN')}</span>
              </div>

              {generatedReceipt.notes && (
                <div className="text-[10px] text-gray-500 italic bg-black/30 p-2.5 rounded border border-slate-900 mt-3 leading-normal">
                  Note: {generatedReceipt.notes}
                </div>
              )}
            </div>

            {/* Action Row */}
            <div className="flex gap-3 border-t border-[#2A344A] pt-4 mt-6 print:hidden">
              <button 
                onClick={() => setGeneratedReceipt(null)}
                className="flex-1 py-3 border border-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                Close Portal
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 py-3 bg-gradient-to-r from-[#996515] to-[#C5A059] text-[#0A1021] rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer shadow"
              >
                Print Receipt
              </button>
            </div>

            {/* Print style block */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden;
                }
                .fixed, .fixed * {
                  visibility: visible;
                }
                .fixed {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  border: none !important;
                  box-shadow: none !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
              }
            `}} />

          </div>
        </div>
      )}

    </div>
  );
}
