import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      logger.debug("🔐 [Auth] State change:", _event, "User:", !!session?.user);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Track user session when they sign in (non-blocking, fire and forget)
      if (session?.user && _event === 'SIGNED_IN') {
        // Use Promise.resolve to make this truly non-blocking
        Promise.resolve().then(async () => {
          try {
            logger.debug("📊 [Auth] Tracking user session...");
            await supabase.functions.invoke('track-user-session');
            logger.debug("✅ [Auth] Session tracked successfully");
          } catch (error) {
            logger.error('⚠️ [Auth] Failed to track session (non-critical):', error);
            // Don't throw - this is a background task
          }
        });
      }
      
      // Mark loading as complete after auth state is set
      if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error("❌ [Auth] Error getting session:", error);
      }
      logger.debug("🔐 [Auth] Initial session check:", !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      logger.error("💥 [Auth] Unexpected error getting session:", error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    if (error) throw error;
    
    // Send branded verification email via our custom edge function
    if (data.user && !data.user.email_confirmed_at) {
      try {
        await supabase.functions.invoke("send-verification-email", {
          body: {},
        });
        logger.info("✅ [Auth] Verification email sent to:", email);
      } catch (emailError) {
        logger.error("⚠️ [Auth] Failed to send verification email:", emailError);
        // Don't throw - account is still created, user can resend later
      }
    }
    
    toast({
      title: "Account created!",
      description: "Welcome to 6Seven. Please check your email to verify your account.",
    });
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    toast({
      title: "Welcome back!",
      description: "You're now signed in.",
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    toast({
      title: "Signed out",
      description: "Come back soon!",
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
