"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth, db, signOut, onAuthStateChanged } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Launcher() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("sd_current_user_email"));
      setUserName(localStorage.getItem("sd_current_user_name"));
      setUserAvatar(localStorage.getItem("sd_current_user_avatar"));
      setUserRole(localStorage.getItem("sd_current_user_role") || "user");
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          let role = "user";
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            if (data.role) role = data.role;
          }
          const finalName = user.displayName || user.email?.split("@")[0] || "User";
          const finalAvatar = user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

          localStorage.setItem("sd_current_user_email", user.email || "");
          localStorage.setItem("sd_current_user_name", finalName);
          localStorage.setItem("sd_current_user_avatar", finalAvatar);
          localStorage.setItem("sd_current_user_role", role);
          localStorage.setItem("sd_current_user_uid", user.uid);

          setUserEmail(user.email);
          setUserName(finalName);
          setUserAvatar(finalAvatar);
          setUserRole(role);
        } catch (err) {
          console.error("Launcher role fetch error", err);
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

  const apps = [
    {
      id: 'gold',
      name: 'GOLD HUB',
      tagline: 'Luxury Assets',
      desc: 'Premium gold jewelry marketplace and verified vendor management ecosystem.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" viewBox="0 0 24 24" fill="none" stroke="url(#gold-gradient)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <defs>
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFFACD" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
          </defs>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <circle cx="12" cy="10" r="3"/>
          <path d="M12 18l-2-2m2 2l2-2"/>
        </svg>
      ),
      url: userRole === 'super_admin' ? 'https://sd-gold-hub.vercel.app/admin?token=sd_super_admin_secret_token' : 'https://sd-gold-hub.vercel.app',
    },
    {
      id: 'bhulia',
      name: 'BHULIA HUB',
      tagline: 'Handcrafted Textiles',
      desc: 'Authentic handloom heritage, crafted textiles, and regional artisan networks.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      ),
      url: 'https://sd-bhulia-hub.vercel.app',
    },
    {
      id: 'dehapa',
      name: 'DEHAPA HEALTH',
      tagline: 'Wellness Solutions',
      desc: 'Advanced medical diagnostics, wellness integrations, and healthcare tracking.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <path d="M18 12c-1.5-1-3-1-3 1s1.5 2 3 3-3 2-3 2" />
          <path d="M6 12c1.5-1 3-1 3 1s-1.5 2-3 3 3 2 3 2" />
        </svg>
      ),
      url: '#',
    },
    {
      id: 'it',
      name: 'IT HUB',
      tagline: 'Digital Infrastructure',
      desc: 'Custom domains, white-label systems, analytics, and ecosystem hosting.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      url: '#',
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex flex-col font-sans text-white relative overflow-hidden">
      {/* Background Sweeping Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="#D4AF37" strokeWidth="0.2" />
          <path d="M0,60 Q25,40 50,60 T100,60" fill="none" stroke="#D4AF37" strokeWidth="0.1" />
          <path d="M0,80 Q30,100 60,80 T100,90" fill="none" stroke="#D4AF37" strokeWidth="0.2" />
          <path d="M0,20 Q40,0 70,30 T100,10" fill="none" stroke="#D4AF37" strokeWidth="0.15" />
        </svg>
      </div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-[100px] z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] z-0" />

      {/* Global Header */}
      <header className="h-[72px] border-b border-[#D4AF37]/20 bg-[#0A0F1E]/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Image src="/sd_logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-wider text-white">Universal</h1>
            <h1 className="text-sm font-light tracking-widest text-[#A0AEC0]">Ecosystem</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 bg-[#1A2035] border border-[#D4AF37]/30 hover:border-[#D4AF37] px-4 py-2 rounded-lg text-sm text-[#D4AF37] transition-all">
            App Switcher
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          <div className="relative">
            <button className="text-[#A0AEC0] hover:text-white transition-colors cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <span className="absolute -top-1 -right-1 bg-[#D4AF37] text-[#0A0F1E] text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">3</span>
          </div>

          <div className="flex items-center gap-3 pl-6 border-l border-[#D4AF37]/20">
            {userAvatar ? (
              <img src={userAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#D4AF37] text-[#0A0F1E] flex items-center justify-center font-bold text-sm font-mono">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="flex flex-col hidden sm:flex">
              <span className="text-sm font-semibold text-white">{userName || userEmail?.split("@")[0] || "User"}</span>
              <span className="text-xs text-[#D4AF37] tracking-widest uppercase font-mono">{userRole}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-red-400 ml-4 transition-colors font-mono uppercase tracking-widest cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        
        <div className="text-center mb-16 mt-8">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-wide mb-3">Universal Ecosystem Launchpad</h2>
          <p className="text-[#A0AEC0] text-sm md:text-base tracking-wider uppercase font-light">High-fidelity web UI for a luxury enterprise system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-[1400px] w-full px-4">
          {apps.map((app, index) => (
            <a 
              key={app.id}
              href={app.url}
              className="group relative flex flex-col items-center text-center p-8 rounded-[2rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 h-[460px] cursor-pointer"
            >
              {/* Glass Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent backdrop-blur-xl border border-white/[0.15] rounded-[2rem] group-hover:border-[#D4AF37]/50 group-hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] transition-all duration-500" />
              
              {/* Inner content */}
              <div className="relative z-10 flex flex-col items-center h-full justify-between pt-4 pb-2">
                <div className="transform group-hover:scale-110 transition-transform duration-500">
                  {app.icon}
                </div>
                
                <div>
                  <h3 className={`text-lg font-bold tracking-widest uppercase mb-1 ${index === 0 ? 'text-[#D4AF37]' : 'text-[#E2E8F0]'}`}>
                    {app.name}
                  </h3>
                  <h4 className="text-white text-base mb-4 font-medium">{app.tagline}</h4>
                  <p className="text-[#A0AEC0] text-xs leading-relaxed max-w-[200px] mx-auto opacity-80">
                    {app.desc}
                  </p>
                </div>
              </div>

              {/* Glowing highlight at top */}
              <div className={`absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent ${index === 0 ? 'via-[#D4AF37]' : 'via-white/50'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
