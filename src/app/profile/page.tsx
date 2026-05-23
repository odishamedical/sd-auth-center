"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { auth, signOut } from "../../lib/firebase";

export default function UserProfile() {
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  useEffect(() => {
    // 1. Ensure client side rendering
    if (typeof window !== "undefined") {
      const email = localStorage.getItem("sd_current_user_email");
      const role = localStorage.getItem("sd_current_user_role");
      
      if (!email) {
        router.push("/");
        return;
      }

      // If they are admin, they shouldn't be trapped here, but we can let them see it or redirect.
      // Usually admins use /launcher, but if they navigated here manually, that's fine.
      
      setUserName(localStorage.getItem("sd_current_user_name") || "User");
      setUserEmail(email);
      setUserAvatar(localStorage.getItem("sd_current_user_avatar") || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80");
    }
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.clear();
    router.push("/");
  };

  const getSsoParams = () => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams({
      sso_email: localStorage.getItem('sd_current_user_email') || '',
      sso_name: localStorage.getItem('sd_current_user_name') || '',
      sso_avatar: localStorage.getItem('sd_current_user_avatar') || '',
      sso_role: localStorage.getItem('sd_current_user_role') || 'user',
      token: 'sd_user_sso_token'
    });
    return `?${params.toString()}`;
  };

  const ecosystemLinks = [
    { name: "Gold Hub", url: `https://sd-gold-hub.vercel.app${getSsoParams()}`, desc: "Premium luxury marketplace" },
    { name: "Directory", url: `https://sd-directory.vercel.app${getSsoParams()}`, desc: "Odisha business index" },
    { name: "IT Hub", url: `https://sd-it-hub-w3sk.vercel.app${getSsoParams()}`, desc: "Digital infrastructure" },
    { name: "News Hub", url: `https://sd-news-hub.vercel.app${getSsoParams()}`, desc: "Local broadcast network" },
  ];

  if (!userEmail) return null;

  return (
    <div className="min-h-screen bg-[#0A0F1E] font-sans text-white relative overflow-hidden flex flex-col items-center justify-center p-6">
      
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0A0F1E] rounded-full blur-[150px]" />

      <div className="z-10 w-full max-w-2xl">
        <div className="sd-glass-card p-10 flex flex-col md:flex-row gap-10 items-center md:items-start relative overflow-hidden">
          
          {/* Glowing Top Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

          {/* Profile Sidebar */}
          <div className="flex flex-col items-center text-center w-full md:w-1/3">
            <div className="w-32 h-32 rounded-full overflow-hidden border-[3px] border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.2)] mb-4 relative">
              <img src={userAvatar!} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold tracking-wider">{userName}</h2>
            <p className="text-[#A0AEC0] text-xs mb-6 truncate w-full px-4">{userEmail}</p>

            <button 
              onClick={handleSignOut}
              className="px-6 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full text-xs font-bold uppercase tracking-widest transition-colors w-full"
            >
              Sign Out
            </button>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-64 bg-[#D4AF37]/20" />

          {/* Ecosystem Links */}
          <div className="w-full md:w-2/3 flex flex-col">
            <h3 className="text-sm uppercase tracking-widest text-[#D4AF37] mb-6 font-semibold">Your Ecosystem Access</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ecosystemLinks.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.url}
                  className="bg-black/40 border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 p-4 rounded-xl flex flex-col transition-all hover:-translate-y-1 hover:shadow-[0_5px_15px_rgba(212,175,55,0.1)] group"
                >
                  <span className="font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors">{link.name}</span>
                  <span className="text-[10px] text-[#A0AEC0] mt-1">{link.desc}</span>
                </a>
              ))}
            </div>

            <div className="mt-8 bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-[#A0AEC0] leading-relaxed">
                As a standard user, you have single-sign-on access to all public platforms. Master Admin controls are restricted.
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
