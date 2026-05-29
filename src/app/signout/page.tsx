"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";

const AUTH_KEYS = [
  "sd_current_user_email",
  "sd_current_user_name",
  "sd_current_user_avatar",
  "sd_current_user_role",
  "sd_current_user_uid",
  "sd_current_user_profile_complete",
  "sd_pending_redirect",
  "sd_pending_referral",
  "sd_referral_id",
];

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const doSignOut = async () => {
      // 1. Sign out from Firebase (kills the session for all tabs/domains)
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Firebase signOut error:", e);
      }

      // 2. Clear all auth keys from this domain's localStorage
      AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();

      // 3. Redirect back to the originating app (or auth-center home)
      // Append ?sd_signout=1 so the destination project clears ITS OWN localStorage
      // (localStorage is domain-scoped — we cannot clear other domains' storage from here)
      const params = new URLSearchParams(window.location.search);
      const redirectBack = params.get("redirect") || "/";
      const separator = redirectBack.includes("?") ? "&" : "?";
      const redirectWithSignout = `${redirectBack}${separator}sd_signout=1`;

      // Small delay so Firebase session is fully flushed
      setTimeout(() => {
        window.location.href = redirectWithSignout;
      }, 300);
    };

    doSignOut();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Spinner */}
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
        <p className="text-[#D4AF37] text-sm font-bold uppercase tracking-widest">
          Signing out&hellip;
        </p>
        <p className="text-gray-500 text-xs">
          Clearing your session securely across all SD projects
        </p>
      </div>
    </div>
  );
}
