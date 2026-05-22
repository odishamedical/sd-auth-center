"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth, db, signOut, onAuthStateChanged } from '../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function Launcher() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [userUid, setUserUid] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("sd_current_user_email"));
      setUserName(localStorage.getItem("sd_current_user_name"));
      setUserAvatar(localStorage.getItem("sd_current_user_avatar"));
      setUserRole(localStorage.getItem("sd_current_user_role") || "user");
      setUserUid(localStorage.getItem("sd_current_user_uid"));
    }

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
        } catch (err) {
          console.warn("Launcher role fetch error (permission denied), using fallback", err);
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

        setUserEmail(user.email);
        setUserName(finalName);
        setUserAvatar(finalAvatar);
        setUserRole(role);
        setUserUid(user.uid);

        // Fetch Viral Referral Count
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
      url: userRole === 'super_admin' ? `https://sd-gold-hub.vercel.app/admin${getSsoParams()}` : `https://sd-gold-hub.vercel.app${getSsoParams()}`,
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
      url: `https://sd-bhulia-hub.vercel.app${getSsoParams()}`,
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
      url: `https://sd-dehapa-hub.vercel.app${getSsoParams()}`,
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
      url: `https://sd-it-hub-w3sk.vercel.app${getSsoParams()}`,
    },
    {
      id: 'directory',
      name: 'SD DIRECTORY',
      tagline: 'Odisha Business Index',
      desc: 'Odisha business directory index and local storefront claims.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      ),
      url: `https://sd-directory.vercel.app${getSsoParams()}`,
    },
    {
      id: 'news',
      name: 'NEWS HUB',
      tagline: 'Global & Local Media',
      desc: 'Live news aggregation, reporter management, and localized broadcasting.',
      icon: (
        <svg className="w-24 h-24 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10l6 6v10a2 2 0 0 1-2 2Z" />
          <path d="M14 2v6h6" />
          <path d="M8 12h8" />
          <path d="M8 16h8" />
        </svg>
      ),
      url: `https://sd-news-hub.vercel.app${getSsoParams()}`,
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
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.15:9c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 md:gap-8 max-w-[1500px] w-full px-4">
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

        {/* Viral Network Dashboard */}
        {userUid && (
          <div className="mt-16 w-full max-w-[1500px] px-4">
            <div className="bg-[#1A2035]/80 backdrop-blur-md border border-[#D4AF37]/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent pointer-events-none" />
              
              <div className="flex-1 z-10">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-wide font-serif">
                  My <span className="text-[#D4AF37]">Viral Network</span>
                </h3>
                <p className="text-[#A0AEC0] text-sm md:text-base max-w-lg mb-4">
                  Share your unique Sovereign Ecosystem link via WhatsApp. Every time a new user signs in using your link, they are permanently attributed to your network.
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-[#A0AEC0]">Your Unique ID:</span>
                  <code className="bg-[#0A0F1E] px-3 py-1.5 rounded-md border border-[#D4AF37]/20 text-[#D4AF37] font-mono text-sm shadow-inner">
                    {userUid}
                  </code>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-[#0A0F1E]/50 border border-[#D4AF37]/20 rounded-2xl min-w-[200px] z-10">
                <span className="text-5xl font-black text-[#D4AF37] tracking-tighter mb-1">
                  {referralCount}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#A0AEC0] font-bold">
                  Successful Referrals
                </span>
              </div>
              
              <div className="z-10">
                <button 
                  onClick={() => {
                    const shareUrl = `https://sd-gold-hub.vercel.app?ref=${userUid}`;
                    const message = `Join the Shyam Dash Sovereign Ecosystem! Explore Gold, Handlooms, Health, and IT directly: ${shareUrl}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
                  }}
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(37,211,102,0.4)] cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.245 3.481 5.231 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.859c1.619.96 3.46 1.468 5.352 1.468 5.435-.002 9.851-4.418 9.853-9.853.001-2.635-1.023-5.114-2.885-6.976-1.862-1.863-4.341-2.888-6.977-2.887-5.435.002-9.851 4.418-9.853 9.853-.001 1.932.508 3.81 1.472 5.441l-1.002 3.659 3.754-.985zm9.588-6.353c-.524-.262-3.098-1.53-3.578-1.705-.48-.175-.83-.262-1.18.262-.35.524-1.355 1.705-1.66 2.055-.306.35-.612.394-1.136.131-.524-.262-2.213-.816-4.215-2.603-1.558-1.39-2.609-3.109-2.915-3.633-.306-.524-.033-.808.23-.107.235.262.524.524.787.787.262.262.35.524.525.875.175.35.087.656-.044.919-.131.262-1.18 2.844-1.617 3.894-.426.102-.853.088-1.18-.175-.382-.306-.382-.787-.382-.787v-.001c0-1.662 1.348-3.01 3.01-3.01h.001c1.237 0 2.308.75 2.771 1.832.22-.163.454-.316.702-.456.623-.35 1.312-.533 2.02-.533 2.321 0 4.209 1.888 4.209 4.209 0 .445-.07.88-.204 1.295-.401 1.248-1.576 2.148-2.956 2.148-.225 0-.447-.024-.664-.071z"/>
                  </svg>
                  Share to WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
