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
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking roles:', error);
        return { isAdmin: false, isStreamer: false };
      }
      
      const roles = data?.map(r => r.role) || [];
      return {
        isAdmin: roles.includes('admin'),
        isStreamer: roles.includes('streamer'),
      };
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsStreamer(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isStreamer, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
