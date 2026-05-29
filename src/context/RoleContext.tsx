"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db, doc, getDoc, setDoc } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

export type AdminRole = 'super_admin' | 'project_admin' | 'manager';

export interface RoleData {
  role: AdminRole;
  assignedHubs: string[];
}

interface RoleContextType {
  roleData: RoleData | null;
  loadingRole: boolean;
  isSuperAdmin: boolean;
  canManageHub: (hub: string) => boolean;
}

const RoleContext = createContext<RoleContextType>({} as RoleContextType);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !user.email) {
      setRoleData(null);
      setLoadingRole(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const roleRef = doc(db, "admin_roles", user.email!);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
          const data = roleSnap.data() as RoleData;
          // ONE-TIME HOTFIX to downgrade the test account back to Project Admin
          if (user.email === "npfcodisha@gmail.com" && data.role === "super_admin") {
            const projectAdminData: RoleData = { role: 'project_admin', assignedHubs: ['news'] };
            await setDoc(roleRef, projectAdminData);
            setRoleData(projectAdminData);
          } else {
            setRoleData(data);
          }
        } else {
          // AUTO-SEED: Seed initial roles if they don't exist in the database yet
          if (user.email === "shyamdashcreation@gmail.com" || user.email === "admin@shyamdash.com" || user.email === "odishamedical@gmail.com") {
            const superAdminData: RoleData = {
              role: 'super_admin',
              assignedHubs: ['all']
            };
            await setDoc(roleRef, superAdminData);
            setRoleData(superAdminData);
          } else if (user.email === "npfcodisha@gmail.com") {
            const projectAdminData: RoleData = {
              role: 'project_admin',
              assignedHubs: ['news']
            };
            await setDoc(roleRef, projectAdminData);
            setRoleData(projectAdminData);
          } else {
            // Unrecognized user. No role.
            setRoleData(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch RBAC role", err);
        setRoleData(null);
      }
      setLoadingRole(false);
    };

    fetchRole();
  }, [user, authLoading]);

  const isSuperAdmin = roleData?.role === 'super_admin';

  const canManageHub = (hub: string) => {
    if (isSuperAdmin) return true;
    if (!roleData || !roleData.assignedHubs) return false;
    return roleData.assignedHubs.includes(hub) || roleData.assignedHubs.includes('all');
  };

  return (
    <RoleContext.Provider value={{ roleData, loadingRole, isSuperAdmin, canManageHub }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
