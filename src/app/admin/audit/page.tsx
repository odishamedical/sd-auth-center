"use client";

import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { db, collection, query, orderBy, getDocs } from "@/lib/firebase";

export default function AuditLogsFull() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "ecosystem_logs"), orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white">Full Audit Trail</h2>
          <p className="text-sm text-slate-400 mt-1">Immutable record of all ecosystem compliance events.</p>
        </div>
        <button onClick={fetchLogs} className="p-3 bg-[#090F1D] border border-slate-800 hover:border-slate-600 rounded-xl text-slate-400 transition-colors">
          <Icons.RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-[#00D4FF]' : ''}`} />
        </button>
      </div>

      <div className="flex-1 bg-[#090F1D] border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#060B14] text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-md">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Platform</th>
                <th className="px-6 py-4 font-medium">Admin ID</th>
                <th className="px-6 py-4 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    {loading ? "Decrypting logs..." : "No compliance logs found."}
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp?.seconds * 1000).toLocaleString() : "Just now"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300 capitalize">{log.platform || "Ecosystem"}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.adminId}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs text-right max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
