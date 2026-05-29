import { db, collection, addDoc, serverTimestamp } from "@/lib/firebase";

export type AuditAction = 
  | 'AD_UPLOADED' 
  | 'AD_TOGGLED' 
  | 'AD_DELETED' 
  | 'AD_IMPRESSION' 
  | 'AD_CLICK'
  | 'SETTINGS_UPDATED';

export type Platform = 'directory' | 'gold' | 'bhulia' | 'dehapa' | 'news' | 'it' | 'admin_panel' | 'all';

interface LogOptions {
  action: AuditAction;
  platform: Platform;
  adminId: string;
  details?: Record<string, any>;
}

export const logEcosystemEvent = async ({ action, platform, adminId, details = {} }: LogOptions) => {
  try {
    await addDoc(collection(db, "ecosystem_logs"), {
      action,
      platform,
      adminId,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to write to ecosystem_logs", error);
  }
};
