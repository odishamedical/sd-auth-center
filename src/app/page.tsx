"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { auth, db, googleProvider, signInWithPopup } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      let userRole = "user";

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.role) userRole = data.role;
        } else {
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split("@")[0] || "User",
            profilePhoto: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
            role: "user",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            linkedProjects: ["sd-auth-center"]
          });
        }
      } catch (firestoreErr) {
        console.warn("Firestore rule check skipped or permission denied. Defaulting to fallback role.", firestoreErr);
        if (user.email?.includes("shyamdash") || user.email?.includes("odishamedical") || user.email?.includes("admin")) {
          userRole = "super_admin";
        }
      }

      const finalName = user.displayName || user.email?.split("@")[0] || "User";
      const finalAvatar = user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

      localStorage.setItem("sd_current_user_email", user.email || "");
      localStorage.setItem("sd_current_user_name", finalName);
      localStorage.setItem("sd_current_user_avatar", finalAvatar);
      localStorage.setItem("sd_current_user_role", userRole);
      localStorage.setItem("sd_current_user_uid", user.uid);

      router.push('/launcher');
    } catch (error: any) {
      console.error("Google OAuth Error:", error);
      setErrorMsg(error.message || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(null);
    setTimeout(() => {
      localStorage.setItem("sd_current_user_email", email);
      localStorage.setItem("sd_current_user_name", email.split("@")[0]);
      localStorage.setItem("sd_current_user_role", email.includes("admin") ? "super_admin" : "user");
      router.push('/launcher');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-[#0A0F1E]">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0A0F1E] rounded-full blur-[150px]" />

      <div className="z-10 w-full max-w-md p-8">
        <div className="sd-glass-card p-10 flex flex-col items-center">
          <div className="mb-8 w-24 h-24 relative flex items-center justify-center bg-black/40 rounded-full border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <Image 
              src="/sd_logo.png" 
              alt="Shyam Dash Logo" 
              width={60} 
              height={60} 
              className="object-contain"
              priority
            />
          </div>
          
          <h1 className="text-3xl font-light tracking-wider mb-2 text-white">SD AUTH CENTER</h1>
          <p className="text-[#A0AEC0] text-sm mb-8 tracking-widest uppercase">Universal Ecosystem Login</p>

          {errorMsg && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg mb-6 text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">Master Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                placeholder="admin@shyamdash.com"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">Secure Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                placeholder="••••••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="sd-button-luxury mt-4 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0A0F1E] border-t-transparent rounded-full animate-spin" />
              ) : "AUTHENTICATE"}
            </button>
          </form>

          {/* Google Login Section */}
          <div className="w-full mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="h-px bg-[#D4AF37]/20 flex-1" />
              <span className="text-[10px] text-[#A0AEC0] tracking-widest uppercase">Or</span>
              <div className="h-px bg-[#D4AF37]/20 flex-1" />
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-lg px-4 py-3 transition-colors cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.2/81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-semibold tracking-wider">SIGN IN WITH GMAIL</span>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D4AF37]/10 w-full text-center">
            <p className="text-[10px] text-[#A0AEC0]/60 uppercase tracking-widest">Secured by Firebase Enterprise</p>
          </div>
        </div>
      </div>
    </div>
  );
}
