"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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
      // ── STEP 1: Capture email BEFORE clearing anything ─────────────────
      // We need the email to write the broadcast event while still authenticated
      const email = localStorage.getItem("sd_current_user_email");
      const uid = localStorage.getItem("sd_current_user_uid") || "unknown";

      // ── STEP 2: Write signout broadcast to Firestore ────────────────────
      // This fires BEFORE signOut() so we're still authenticated (rules allow write)
      // All other SD projects' GlobalHeaders listen to this collection via onSnapshot
      // and will immediately clear THEIR OWN localStorage when this event appears.
      if (email) {
        try {
          await addDoc(collection(db, "signout_broadcast"), {
            email,
            uid,
            timestamp: serverTimestamp(),
            origin: typeof window !== "undefined" ? window.location.hostname : "unknown",
          });
          console.log("Signout broadcast written for:", email);
        } catch (e) {
          console.warn("Could not write signout broadcast (will still sign out):", e);
        }
      }

      // ── STEP 3: Sign out from Firebase ─────────────────────────────────
      try {
        await signOut(auth);
      } catch (e) {
        console.warn("Firebase signOut error:", e);
      }

      // ── STEP 4: Clear this domain's localStorage ────────────────────────
      AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();

      // ── STEP 5: Redirect back to originating app with ?sd_signout=1 ─────
      // The ?sd_signout=1 param is a fallback in case the onSnapshot listener
      // was not set up yet when the user lands back on the originating project.
      const params = new URLSearchParams(window.location.search);
      const redirectBack = params.get("redirect") || "/";
      const separator = redirectBack.includes("?") ? "&" : "?";
      const redirectWithSignout = `${redirectBack}${separator}sd_signout=1`;

      // Small delay to allow Firestore write to propagate
      setTimeout(() => {
        window.location.href = redirectWithSignout;
      }, 500);
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
