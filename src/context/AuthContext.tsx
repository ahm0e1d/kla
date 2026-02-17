import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserPermissions {
  isAdmin: boolean;
  hasCustomRole: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  hasCustomRole: boolean;
  permissions: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCustomRole, setHasCustomRole] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const checkUserRoles = async (email: string): Promise<UserPermissions> => {
    // First, find the approved user by email
    const { data: approvedUser, error: approvedError } = await supabase
      .from("approved_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (approvedError || !approvedUser) {
      console.error("Error finding approved user:", approvedError);
      return { isAdmin: false, hasCustomRole: false, permissions: [] };
    }

    // Check if this approved user has admin role (not removed)
    const { data: adminRole, error: adminError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", approvedUser.id)
      .eq("role", "admin")
      .is("removed_at", null)
      .maybeSingle();

    if (adminError) {
      console.error("Error checking admin role:", adminError);
    }

    const isAdminUser = !!adminRole;

    // If admin, they have all permissions
    if (isAdminUser) {
      return { isAdmin: true, hasCustomRole: false, permissions: [] };
    }

    // Check for custom roles
    const { data: userCustomRoles, error: customRolesError } = await supabase
      .from("user_custom_roles")
      .select("role_id")
      .eq("user_id", approvedUser.id);

    if (customRolesError) {
      console.error("Error checking custom roles:", customRolesError);
      return { isAdmin: false, hasCustomRole: false, permissions: [] };
    }

    if (!userCustomRoles || userCustomRoles.length === 0) {
      return { isAdmin: false, hasCustomRole: false, permissions: [] };
    }

    // Get the permissions from custom_roles
    const roleIds = userCustomRoles.map(r => r.role_id);
    const { data: roles, error: rolesError } = await supabase
      .from("custom_roles")
      .select("permissions")
      .in("id", roleIds);

    if (rolesError) {
      console.error("Error fetching role permissions:", rolesError);
      return { isAdmin: false, hasCustomRole: true, permissions: [] };
    }

    // Combine all permissions from all roles
    const allPermissions: string[] = [];
    roles?.forEach(role => {
      if (Array.isArray(role.permissions)) {
        allPermissions.push(...(role.permissions as string[]));
      }
    });

    // Remove duplicates
    const uniquePermissions = [...new Set(allPermissions)];

    return { isAdmin: false, hasCustomRole: true, permissions: uniquePermissions };
  };

  const updateUserState = (userPermissions: UserPermissions) => {
    setIsAdmin(userPermissions.isAdmin);
    setHasCustomRole(userPermissions.hasCustomRole);
    setPermissions(userPermissions.permissions);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer role check with setTimeout to avoid deadlock
        if (session?.user?.email) {
          setTimeout(() => {
            checkUserRoles(session.user.email!).then(updateUserState);
          }, 0);
        } else {
          setIsAdmin(false);
          setHasCustomRole(false);
          setPermissions([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        checkUserRoles(session.user.email).then((userPermissions) => {
          updateUserState(userPermissions);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setHasCustomRole(false);
    setPermissions([]);
  };

  const refreshAdminStatus = async () => {
    if (session?.user?.email) {
      const userPermissions = await checkUserRoles(session.user.email);
      updateUserState(userPermissions);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAdmin, 
      hasCustomRole, 
      permissions, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      refreshAdminStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
