import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isStreamer: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  getRoleBasedRedirect: () => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isStreamer: false,
  isLoading: true,
  signOut: async () => {},
  getRoleBasedRedirect: () => '/user/dashboard',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRoles = async (userId: string) => {
    try {
      // Check user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error checking roles:', roleError);
      }
      
      const roles = roleData?.map(r => r.role) || [];
      let isAdmin = roles.includes('admin');
      let isStreamer = roles.includes('streamer');

      // Also check if user owns a streamer page (streamers table)
      if (!isStreamer) {
        const { data: streamerData } = await supabase
          .from('streamers')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .maybeSingle();
        if (streamerData) isStreamer = true;
      }

      return { isAdmin, isStreamer };
    } catch (error) {
      console.error('Error checking roles:', error);
      return { isAdmin: false, isStreamer: false };
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role check with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkRoles(session.user.id).then(({ isAdmin, isStreamer }) => {
              setIsAdmin(isAdmin);
              setIsStreamer(isStreamer);
            });
          }, 0);
        } else {
          setIsAdmin(false);
          setIsStreamer(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkRoles(session.user.id).then(({ isAdmin, isStreamer }) => {
          setIsAdmin(isAdmin);
          setIsStreamer(isStreamer);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRoleBasedRedirect = useCallback(() => {
    if (isAdmin) return '/dashboard';
    if (isStreamer) return '/streamer/dashboard';
    return '/user/dashboard';
  }, [isAdmin, isStreamer]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsStreamer(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isStreamer, isLoading, signOut, getRoleBasedRedirect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
