"use client";

import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "@/lib/firebase";
import { logEcosystemEvent, Platform } from "@/lib/logger";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/context/RoleContext";

export default function AdManager() {
  const { user } = useAuth();
  const { roleData, isSuperAdmin, canManageHub } = useRole();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ALL_PLATFORMS: Platform[] = ['directory', 'gold', 'bhulia', 'dehapa', 'news', 'it'];
  
  // Filter platforms based on RBAC assignedHubs
  const availablePlatforms: Platform[] = isSuperAdmin 
    ? ALL_PLATFORMS 
    : ALL_PLATFORMS.filter(p => roleData?.assignedHubs?.includes(p));

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ecosystem_ads"));
      let fetchedAds: any[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Enforce RBAC on the client side list (Firestore rules should also secure this eventually)
      if (!isSuperAdmin) {
        fetchedAds = fetchedAds.filter(ad => 
          ad.platforms?.some((p: string) => roleData?.assignedHubs?.includes(p))
        );
      }
      
      setAds(fetchedAds);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl || selectedPlatforms.length === 0) return alert("Image URL and at least 1 platform required.");
    setIsSubmitting(true);
    
    try {
      const adData = {
        imageUrl,
        targetUrl,
        platforms: selectedPlatforms,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        status: "active",
        version: 1,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "ecosystem_ads"), adData);
      
      await logEcosystemEvent({
        action: 'AD_UPLOADED',
        platform: 'all',
        adminId: user?.email || "unknown_admin",
        details: { adId: docRef.id, platforms: selectedPlatforms }
      });

      setShowModal(false);
      resetForm();
      fetchAds();
    } catch (err) {
      console.error(err);
      alert("Failed to create ad campaign.");
    }
    setIsSubmitting(false);
  };

  const toggleAdStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      await updateDoc(doc(db, "ecosystem_ads", id), { status: newStatus });
      
      await logEcosystemEvent({
        action: 'AD_TOGGLED',
        platform: 'all',
        adminId: user?.email || "unknown_admin",
        details: { adId: id, newStatus }
      });
      
      fetchAds();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this ad?")) return;
    try {
      // For versioning/compliance, we should soft-delete or copy to history. For MVP we will delete.
      await deleteDoc(doc(db, "ecosystem_ads", id));
      
      await logEcosystemEvent({
        action: 'AD_DELETED',
        platform: 'all',
        adminId: user?.email || "unknown_admin",
        details: { adId: id }
      });
      
      fetchAds();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setImageUrl("");
    setTargetUrl("");
    setSelectedPlatforms([]);
    setStartDate("");
    setExpiryDate("");
  };

  const togglePlatformSelection = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter(plat => plat !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Ad Manager</h2>
          <p className="text-sm text-slate-400 mt-1">Deploy cross-site banners and manage active campaigns.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#00D4FF] hover:bg-[#00b8e6] text-[#030B1A] font-bold rounded-lg flex items-center gap-2 transition-colors"
        >
          <Icons.Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="bg-[#090F1D] border border-slate-800/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#060B14] text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Banner</th>
              <th className="px-6 py-4 font-medium">Target Platforms</th>
              <th className="px-6 py-4 font-medium">Schedule</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {ads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {loading ? "Loading campaigns..." : (isSuperAdmin ? "No active campaigns found." : "No active campaigns found for your assigned hubs.")}
                </td>
              </tr>
            ) : ads.map(ad => (
              <tr key={ad.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-10 rounded overflow-hidden bg-slate-800 border border-slate-700">
                      <img src={ad.imageUrl} alt="Ad preview" className="w-full h-full object-cover" />
                    </div>
                    {ad.targetUrl && (
                      <a href={ad.targetUrl} target="_blank" rel="noreferrer" className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1">
                        <Icons.Link className="w-3 h-3" /> Link
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {ad.platforms?.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 capitalize border border-slate-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1"><Icons.Play className="w-3 h-3 text-green-400"/> {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'Now'}</div>
                  <div className="flex items-center gap-1 mt-1"><Icons.Square className="w-3 h-3 text-red-400"/> {ad.expiry_date ? new Date(ad.expiry_date).toLocaleDateString() : 'Never'}</div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleAdStatus(ad.id, ad.status)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      ad.status === 'active' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                    }`}
                  >
                    {ad.status.toUpperCase()}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => deleteAd(ad.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
                    <Icons.Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#020610]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090F1D] border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#060B14]">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Icons.Rocket className="w-5 h-5 text-[#00D4FF]" /> Deploy New Campaign
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAd} className="p-6 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Banner Image URL *</label>
                  <input type="url" required value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Click Target URL</label>
                  <input type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="Where should users go?" className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Platforms *</label>
                <div className="flex flex-wrap gap-2">
                  {availablePlatforms.map(p => (
                    <button 
                      type="button" 
                      key={p}
                      onClick={() => togglePlatformSelection(p)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                        selectedPlatforms.includes(p) 
                          ? 'bg-[#00D4FF]/10 border-[#00D4FF]/50 text-[#00D4FF]' 
                          : 'bg-[#020610] border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-800/50 mt-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Schedule Start (Optional)</label>
                  <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date (Optional)</label>
                  <input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full bg-[#020610] border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00D4FF]" />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[#00D4FF] hover:bg-[#00b8e6] text-[#030B1A] font-bold rounded-lg transition-colors flex items-center gap-2">
                  {isSubmitting ? <Icons.Loader className="w-4 h-4 animate-spin" /> : <Icons.Rocket className="w-4 h-4" />}
                  Deploy Ad
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
