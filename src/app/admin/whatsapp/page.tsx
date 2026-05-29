"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { db, doc, getDoc, setDoc, serverTimestamp } from "@/lib/firebase";
import { logEcosystemEvent } from "@/lib/logger";
import { useAuth } from "@/context/AuthContext";

export default function SettingsManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [adsensePubId, setAdsensePubId] = useState("");
  const [globalAdsEnabled, setGlobalAdsEnabled] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const snap = await getDoc(doc(db, "ecosystem_settings", "global"));
      if (snap.exists()) {
        const data = snap.data();
        setWhatsappToken(data.whatsappToken || "");
        setWhatsappPhoneId(data.whatsappPhoneId || "");
        setAdsensePubId(data.adsensePubId || "");
        setGlobalAdsEnabled(data.globalAdsEnabled !== false);
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
    setLoading(false);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const settingsData = {
        whatsappToken,
        whatsappPhoneId,
        adsensePubId,
        globalAdsEnabled,
        updatedAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, "ecosystem_settings", "global"), settingsData, { merge: true });
      
      await logEcosystemEvent({
        action: 'SETTINGS_UPDATED',
        platform: 'all',
        adminId: user?.email || "unknown_admin",
        details: { fieldsUpdated: Object.keys(settingsData) }
      });
      
      alert("System settings synchronized globally.");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings.");
    }
    setIsSaving(false);
  };

  if (loading) return <div className="p-8 text-slate-500 animate-pulse">Synchronizing configurations...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white">System Settings</h2>
        <p className="text-sm text-slate-400 mt-1">Manage global API keys, AdSense integration, and WhatsApp routing.</p>
      </div>

      <form onSubmit={saveSettings} className="space-y-8">
        
        {/* WhatsApp Config */}
        <div className="bg-[#090F1D] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#060B14]/50 flex items-center gap-3">
            <Icons.MessageCircle className="w-5 h-5 text-[#25D366]" />
            <h3 className="font-bold text-white">WhatsApp Cloud API Configuration</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permanent Access Token</label>
                <input 
                  type="password" 
                  value={whatsappToken} 
                  onChange={e => setWhatsappToken(e.target.value)} 
                  placeholder="EAAL..." 
                  className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number ID</label>
                <input 
                  type="text" 
                  value={whatsappPhoneId} 
                  onChange={e => setWhatsappPhoneId(e.target.value)} 
                  placeholder="10123456789" 
                  className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none" 
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              These credentials will be securely used by all ecosystem hubs (Directory, Gold, News) to send automated programmatic messages.
            </p>
          </div>
        </div>

        {/* AdSense Config */}
        <div className="bg-[#090F1D] border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/80 bg-[#060B14]/50 flex items-center gap-3">
            <Icons.MonitorPlay className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-white">Google AdSense Integration</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2 max-w-md">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Publisher ID (pub-xxxx)</label>
              <input 
                type="text" 
                value={adsensePubId} 
                onChange={e => setAdsensePubId(e.target.value)} 
                placeholder="pub-1234567890" 
                className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#00D4FF] focus:outline-none" 
              />
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-800 rounded-xl bg-[#060B14] hover:bg-slate-800/30 transition-colors">
              <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${globalAdsEnabled ? 'bg-green-500' : 'bg-slate-700'}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${globalAdsEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Enable AdSense Globally</p>
                <p className="text-xs text-slate-500 mt-0.5">If disabled, the AdSense script will be immediately removed from all websites.</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving} 
            className="px-8 py-3 bg-[#00D4FF] hover:bg-[#00b8e6] text-[#030B1A] font-bold rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
          >
            {isSaving ? <Icons.Loader className="w-5 h-5 animate-spin" /> : <Icons.Save className="w-5 h-5" />}
            Save & Synchronize All Systems
          </button>
        </div>

      </form>
    </div>
  );
}
