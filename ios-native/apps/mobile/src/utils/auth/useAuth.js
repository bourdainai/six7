import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import { useAuthModal, useAuthStore } from './store';
import { supabase } from '../supabaseClient';

/**
 * This hook provides authentication functionality using Supabase Auth.
 * It manages session state and provides sign in/up/out functions.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuth(null);
          setUser(null);
        } else if (session) {
          setAuth({
            jwt: session.access_token,
            user: session.user,
          });
          setUser(session.user);
        } else {
          setAuth(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuth(null);
        setUser(null);
      } finally {
        setLoading(false);
        useAuthStore.setState({ isReady: true });
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (session) {
        setAuth({
          jwt: session.access_token,
          user: session.user,
        });
        setUser(session.user);
      } else {
        setAuth(null);
        setUser(null);
      }
      
      if (event === 'SIGNED_OUT') {
        close();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback((email, password) => {
    open({ mode: 'signin' });
  }, [open]);

  const signUp = useCallback(() => {
    open({ mode: 'signup' });
  }, [open]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setAuth(null);
      setUser(null);
      close();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [close, setAuth]);

  // Direct sign in function (called from auth modal)
  const signInWithEmail = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setAuth({
          jwt: data.session.access_token,
          user: data.session.user,
        });
        setUser(data.session.user);
        close();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }, [close, setAuth]);

  // Direct sign up function (called from auth modal)
  const signUpWithEmail = useCallback(async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Create profile record
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            email: email,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      if (data.session) {
        setAuth({
          jwt: data.session.access_token,
          user: data.session.user,
        });
        setUser(data.session.user);
        close();
      } else {
        // Email confirmation required
        return { requiresConfirmation: true };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, [close, setAuth]);

  return {
    isReady: isReady && !loading,
    isAuthenticated: !!user,
    loading,
    signIn,
    signOut,
    signUp,
    signInWithEmail,
    signUpWithEmail,
    auth,
    user,
    setAuth,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;
