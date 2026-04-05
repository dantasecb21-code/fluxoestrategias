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
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(async () => {
          const [profileRes, roleRes] = await Promise.all([
            supabase.from("profiles").select("display_name, approved, avatar_url").eq("user_id", session.user.id).single(),
            supabase.from("user_roles").select("role").eq("user_id", session.user.id).single(),
          ]);
          if (profileRes.data) {
            setDisplayName(profileRes.data.display_name);
            setApproved(profileRes.data.approved ?? false);
            setAvatarUrl(profileRes.data.avatar_url || "");
          }
          if (roleRes.data) setRole(roleRes.data.role as AppRole);
          setLoading(false);
        }, 0);
      } else {
        setDisplayName("");
        setAvatarUrl("");
        setRole(null);
        setApproved(false);
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
    setApproved(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, displayName, avatarUrl, role, approved, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
