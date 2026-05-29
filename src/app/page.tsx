"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, signInWithPopup } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const ODISHA_DISTRICTS = [
  "Angul", "Balasore", "Bargarh", "Bhadrak", "Bolangir", "Boudh", 
  "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", 
  "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Keonjhar", 
  "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", 
  "Nuapada", "Puri", "Rayagada", "Sambalpur", "Sonepur", "Sundargarh"
];

const COUNTRIES = [
  "United States", "United Kingdom", "United Arab Emirates", "Canada", 
  "Australia", "Singapore", "Saudi Arabia", "Germany", "France", "Japan"
];

const INTERESTS = [
  "Gold Jewellery",
  "Sambalpuri Handlooms & Sarees",
  "Healthcare & Telemedicine",
  "Local Business & Services",
  "Breaking News & Articles",
  "IT & Software Services"
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileStep, setProfileStep] = useState(1);
  const [tempUser, setTempUser] = useState<any>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [regionScope, setRegionScope] = useState('India');
  const [state, setState] = useState('Odisha');
  const [district, setDistrict] = useState('Cuttack');
  const [country, setCountry] = useState('United States');
  const [fullAddress, setFullAddress] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [whatsappConsent, setWhatsappConsent] = useState(true);

  // Capture Referral Code and Redirect URI from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      const redirectUri = params.get("redirect_uri");
      
      if (ref) {
        localStorage.setItem("sd_pending_referral", ref);
      }
      // Always update sd_pending_redirect from URL if present (overwrite stale values)
      if (redirectUri) {
        localStorage.setItem("sd_pending_redirect", redirectUri);
      }
      // If no redirect_uri in URL but we have a stale value, keep it
      // (user may have navigated back after being sent to /profile)
    }
  }, []);

  const getInterestFromRedirect = () => {
    const pendingRedirect = localStorage.getItem("sd_pending_redirect");
    if (!pendingRedirect) return null;
    
    if (pendingRedirect.includes("gold")) return "Gold Jewellery";
    if (pendingRedirect.includes("bhulia")) return "Sambalpuri Handlooms & Sarees";
    if (pendingRedirect.includes("dehapa")) return "Healthcare & Telemedicine";
    if (pendingRedirect.includes("directory")) return "Local Business & Services";
    if (pendingRedirect.includes("news")) return "Breaking News & Articles";
    if (pendingRedirect.includes("it-hub") || pendingRedirect.includes("it-services") || pendingRedirect.includes("aboutus")) return "IT & Software Services";
    return null;
  };

  const completeLoginRouting = (uid: string, email: string, name: string, avatar: string, role: string) => {
    const pendingRedirect = localStorage.getItem("sd_pending_redirect");
    
    localStorage.setItem("sd_current_user_email", email);
    localStorage.setItem("sd_current_user_name", name);
    localStorage.setItem("sd_current_user_avatar", avatar);
    localStorage.setItem("sd_current_user_role", role);
    localStorage.setItem("sd_current_user_uid", uid);
    localStorage.setItem("sd_current_user_profile_complete", "true");

    if (role === "super_admin" || role === "admin" || role === "staff") {
      router.push('/launcher');
    } else if (pendingRedirect) {
      const token = "sd_user_sso_token";
      const redirectUrl = new URL(pendingRedirect);
      redirectUrl.searchParams.set("sso_email", email);
      redirectUrl.searchParams.set("sso_name", name);
      redirectUrl.searchParams.set("sso_avatar", avatar);
      redirectUrl.searchParams.set("sso_role", role);
      redirectUrl.searchParams.set("sso_profile_complete", "true");
      redirectUrl.searchParams.set("token", token);
      
      localStorage.removeItem("sd_pending_redirect");
      window.location.href = redirectUrl.toString();
    } else {
      // No redirect_uri — go to profile page
      router.push('/profile');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const finalName = user.displayName || user.email?.split("@")[0] || "User";
      const finalAvatar = user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";

      let userRole = "user";
      if (user.email?.includes("shyamdash") || user.email?.includes("odishamedical") || user.email?.includes("admin")) {
        userRole = "super_admin";
      }

      // Check profile in Firestore first
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let isProfileComplete = false;
        let dbRole = userRole;

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.role) {
            dbRole = data.role;
          }
          if (data.isProfileComplete) {
            isProfileComplete = true;
          }
        }

        // Intercept standard users with incomplete profiles
        if (dbRole !== "super_admin" && dbRole !== "admin" && dbRole !== "staff" && !isProfileComplete) {
          // Save pending redirect before showing profile modal
          // (it's already in localStorage from the useEffect above)
          setTempUser(user);
          setFullName(finalName);
          const firstInterest = getInterestFromRedirect();
          setSelectedInterests(firstInterest ? [firstInterest] : []);
          setProfileStep(1);
          setShowProfileModal(true);
          setLoading(false);
          return;
        }

        // Complete Routing if okay
        completeLoginRouting(user.uid, user.email || "", finalName, finalAvatar, dbRole);

      } catch (firestoreErr) {
        console.warn("Firestore check failed, running fallback router...", firestoreErr);
        completeLoginRouting(user.uid, user.email || "", finalName, finalAvatar, userRole);
      }
    } catch (error: any) {
      console.error("Google OAuth Error:", error);
      setErrorMsg(error.message || "Authentication failed.");
      setLoading(false);
    }
  };

  const handleSubmitProfile = async () => {
    if (!tempUser) return;
    
    if (!whatsappNumber.trim()) {
      alert("WhatsApp number is required!");
      return;
    }
    
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", tempUser.uid);
      const pendingReferral = localStorage.getItem("sd_pending_referral") || null;
      
      const profileDetails = {
        whatsappNumber: whatsappNumber,
        isWhatsAppVerified: false,
        addressType: regionScope,
        state: regionScope === "India" ? state : "",
        district: regionScope === "India" ? district : "",
        country: regionScope === "India" ? "India" : country,
        fullAddress: fullAddress,
        interests: selectedInterests,
        whatsappConsent: whatsappConsent
      };

      await setDoc(userDocRef, {
        uid: tempUser.uid,
        email: tempUser.email,
        displayName: fullName,
        profilePhoto: tempUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        role: "user",
        isProfileComplete: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        linkedProjects: ["sd-auth-center"],
        referredBy: pendingReferral,
        profileDetails: profileDetails
      }, { merge: true });

      if (pendingReferral) {
        localStorage.removeItem("sd_pending_referral");
      }

      setShowProfileModal(false);
      const finalAvatar = tempUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80";
      completeLoginRouting(tempUser.uid, tempUser.email || "", fullName, finalAvatar, "user");

    } catch (err: any) {
      console.error("Firestore Update Profile Error:", err);
      setErrorMsg("Failed to complete profile: " + err.message);
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(null);
    setTimeout(() => {
      const role: string = email.includes("admin") ? "super_admin" : "user";
      localStorage.setItem("sd_current_user_email", email);
      localStorage.setItem("sd_current_user_name", email.split("@")[0]);
      localStorage.setItem("sd_current_user_role", role);
      localStorage.setItem("sd_current_user_profile_complete", "true");
      
      const pendingRedirect = localStorage.getItem("sd_pending_redirect");
      if (role === "super_admin" || role === "admin" || role === "staff") {
        router.push('/launcher');
      } else if (pendingRedirect) {
        window.location.href = `${pendingRedirect}?token=sd_user_sso_token&sso_email=${email}&sso_role=${role}&sso_profile_complete=true`;
      } else {
        router.push('/profile');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans bg-[#0A0F1E]">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#0A0F1E] rounded-full blur-[150px]" />

      {!showProfileModal ? (
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
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
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
      ) : (
        /* Streamlined 2-Step Profile Completion Modal */
        <div className="z-20 w-full max-w-lg p-6">
          <div className="sd-glass-card p-8 flex flex-col relative overflow-hidden border border-[#D4AF37]/40 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
            
            {/* Top gold glow indicator */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            
            {/* Header & Steps progress */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold tracking-wider text-[#D4AF37]">COMPLETE PROFILE</h2>
              <span className="text-xs uppercase tracking-widest text-[#A0AEC0] bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20 font-semibold">
                Step {profileStep} of 2
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mb-8 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-[#D4AF37] transition-all duration-300"
                style={{ width: profileStep === 1 ? '50%' : '100%' }}
              />
            </div>

            {profileStep === 1 ? (
              /* Step 1: Core details & Address Geolocation */
              <div className="flex flex-col gap-5">
                <p className="text-xs text-[#A0AEC0] leading-relaxed mb-2">
                  Please configure your localized identity profile. Verification registration is currently <strong className="text-white">FREE</strong> under promotion.
                </p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">WhatsApp Number (Mandatory)</label>
                  <div className="flex gap-2">
                    <span className="bg-black/50 border border-[#D4AF37]/20 px-3 py-2.5 rounded-lg text-sm text-[#A0AEC0]">+91</span>
                    <input 
                      type="tel" 
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="9876543210"
                      required
                      className="w-full bg-black/40 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">Region Scope</label>
                    <select
                      value={regionScope}
                      onChange={(e) => {
                        setRegionScope(e.target.value);
                        if (e.target.value === "International") {
                          setCountry("United States");
                        } else {
                          setState("Odisha");
                          setDistrict("Cuttack");
                        }
                      }}
                      className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                    >
                      <option value="India">India</option>
                      <option value="International">International</option>
                    </select>
                  </div>

                  {regionScope === "India" ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">State</label>
                      <select
                        value={state}
                        onChange={(e) => {
                          setState(e.target.value);
                          if (e.target.value === "Odisha") {
                            setDistrict("Cuttack");
                          } else {
                            setDistrict("");
                          }
                        }}
                        className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                      >
                        <option value="Odisha">Odisha</option>
                        <option value="Other State">Other State</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">Country</label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                      >
                        {COUNTRIES.map((c, idx) => (
                          <option key={idx} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {regionScope === "India" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">District</label>
                    {state === "Odisha" ? (
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors max-h-[150px]"
                      >
                        {ODISHA_DISTRICTS.map((dist, idx) => (
                          <option key={idx} value={dist}>{dist}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Enter your district"
                        required
                        className="w-full bg-black/40 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                      />
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">Full Address Details</label>
                  <textarea 
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="Village, Block, Street details, Land mark and Pin-code"
                    required
                    rows={3}
                    className="w-full bg-black/40 border border-[#D4AF37]/20 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (!fullName.trim() || !whatsappNumber.trim() || !fullAddress.trim()) {
                      alert("Please fill up all required fields.");
                      return;
                    }
                    setProfileStep(2);
                  }}
                  className="sd-button-luxury mt-4 cursor-pointer"
                >
                  PROCEED TO STEP 2
                </button>
              </div>
            ) : (
              /* Step 2: Interests selection & consent */
              <div className="flex flex-col gap-6">
                <p className="text-xs text-[#A0AEC0] leading-relaxed">
                  Map your shopping and service interests to customize announcements and promotional templates.
                </p>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] uppercase tracking-wider text-[#A0AEC0] font-semibold">Your Interests (Check all that apply)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INTERESTS.map((interest, idx) => {
                      const isSelected = selectedInterests.includes(interest);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleInterestToggle(interest)}
                          className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                              : 'bg-black/35 border-white/10 text-[#A0AEC0] hover:border-white/20'
                          }`}
                        >
                          <span>{interest}</span>
                          {isSelected && <span className="text-[#D4AF37]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consent Checkbox */}
                <label className="flex gap-3 items-start bg-black/30 border border-white/5 p-4 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={whatsappConsent}
                    onChange={(e) => setWhatsappConsent(e.target.checked)}
                    className="mt-1 cursor-pointer accent-[#D4AF37]"
                  />
                  <span className="text-xs text-[#A0AEC0] leading-relaxed select-none">
                    I agree to receive local promotions, news alerts, and direct order invoices on my WhatsApp number. 
                    <span className="text-[#D4AF37] block mt-0.5">Registration is currently FREE. Cancel anytime.</span>
                  </span>
                </label>

                {/* Button Row */}
                <div className="flex gap-4 mt-2">
                  <button 
                    type="button"
                    onClick={() => setProfileStep(1)}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleSubmitProfile}
                    className="flex-1 sd-button-luxury cursor-pointer"
                  >
                    COMPLETE PROFILE
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
