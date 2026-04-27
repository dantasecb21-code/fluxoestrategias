import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "admin" | "strategic" | "operational";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string;
  role: AppRole | null;
  roles: AppRole[];
  approved: boolean;
  platforms: string[];
  setActiveRole: (role: AppRole) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  displayName: "",
  avatarUrl: "",
  role: null,
  roles: [],
  approved: false,
  platforms: [],
  setActiveRole: () => {},
  signOut: async () => {},
});

const rolePriority: AppRole[] = ["admin", "strategic", "operational"];
const getStoredRoleKey = (userId: string) => `active-role:${userId}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [approved, setApproved] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          const [profileRes, roleRes] = await Promise.all([
            supabase.from("profiles").select("display_name, approved, avatar_url, platforms").eq("user_id", session.user.id).single(),
            supabase.from("user_roles").select("role").eq("user_id", session.user.id),
          ]);
          if (profileRes.data) {
            setDisplayName(profileRes.data.display_name);
            setApproved(profileRes.data.approved ?? false);
            setAvatarUrl(profileRes.data.avatar_url || "");
            setPlatforms((profileRes.data as any).platforms || []);
          }
          if (roleRes.data && roleRes.data.length > 0) {
            const loadedRoles = rolePriority.filter((roleName) => roleRes.data.some((r) => r.role === roleName));
            const storedRole = localStorage.getItem(getStoredRoleKey(session.user.id)) as AppRole | null;
            const activeRole = storedRole && loadedRoles.includes(storedRole) ? storedRole : loadedRoles[0];
            setRoles(loadedRoles);
            setRole(activeRole);
          } else {
            setRoles([]);
            setRole(null);
          }
          setLoading(false);
        }, 0);
      } else {
        setDisplayName("");
        setAvatarUrl("");
        setRole(null);
        setRoles([]);
        setApproved(false);
        setPlatforms([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setRoles([]);
    setApproved(false);
  };

  const setActiveRole = (nextRole: AppRole) => {
    if (!user || !roles.includes(nextRole)) return;
    localStorage.setItem(getStoredRoleKey(user.id), nextRole);
    setRole(nextRole);
  };

  return (
    <AuthContext.Provider value={{ user, loading, displayName, avatarUrl, role, roles, approved, platforms, setActiveRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
