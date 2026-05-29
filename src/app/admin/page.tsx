"use client";

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { db, collection, query, orderBy, limit, getDocs } from "@/lib/firebase";

export default function AdminDashboard() {
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // Create ecosystem_logs if it doesn't exist yet, we just try to fetch
      const q = query(collection(db, "ecosystem_logs"), orderBy("timestamp", "desc"), limit(10));
      const snapshot = await getDocs(q);
      setRecentLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching audit logs", error);
    }
    setLoading(false);
  };

  const getActionColor = (action: string) => {
    if (action.includes("UPLOAD") || action.includes("CREATE")) return "text-green-400 bg-green-500/10 border-green-500/20";
    if (action.includes("DELETE") || action.includes("EXPIRE")) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (action.includes("TOGGLE") || action.includes("UPDATE")) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-[#00D4FF] bg-[#00D4FF]/10 border-[#00D4FF]/20";
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-bold text-white">System Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Ecosystem-wide governance and analytics hub.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Ads", value: "0", icon: <Icons.Megaphone className="w-5 h-5 text-blue-400" /> },
          { label: "Ad Impressions (30d)", value: "0", icon: <Icons.Eye className="w-5 h-5 text-green-400" /> },
          { label: "WhatsApp Hits", value: "0", icon: <Icons.MessageCircle className="w-5 h-5 text-[#25D366]" /> },
          { label: "Active Platforms", value: "5", icon: <Icons.Globe className="w-5 h-5 text-purple-400" /> },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-2xl bg-[#090F1D] border border-slate-800/80 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center shrink-0">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <h4 className="text-2xl font-bold text-white mt-0.5">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Audit Logs */}
      <div className="mt-8 bg-[#090F1D] border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/80 flex justify-between items-center bg-[#060B14]/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Icons.Activity className="w-4 h-4 text-[#00D4FF]" /> Recent Audit Logs
          </h3>
          <button onClick={fetchLogs} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <Icons.RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="p-0">
          {recentLogs.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No audit logs recorded yet. Upload an ad to trigger a log.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#060B14] text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Platform</th>
                  <th className="px-6 py-3 font-medium">Admin</th>
                  <th className="px-6 py-3 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 capitalize">{log.platform || "Ecosystem"}</td>
                    <td className="px-6 py-4 text-slate-400">{log.adminId}</td>
                    <td className="px-6 py-4 text-slate-400 text-right">
                      {log.timestamp ? new Date(log.timestamp?.seconds * 1000).toLocaleString() : "Just now"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
