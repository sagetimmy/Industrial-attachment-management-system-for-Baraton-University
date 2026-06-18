import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser) => {
    try {
      // We still need to fetch the extended profile from our backend
      // which now uses the Supabase user_id as the primary key.
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to basic info if backend profile fetch fails
      setUser({
        user_id: supabaseUser.id,
        email: supabaseUser.email,
        role: supabaseUser.user_metadata?.role || 'student',
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  };

  const register = async (formData) => {
    const { email, password, role, ...metadata } = formData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role || 'student',
          ...metadata,
        },
      },
    });
    if (error) throw error;
    
    // Note: In Supabase, if email confirmation is enabled, the user
    // will need to verify their email before they can fully sign in.
    return data;
  };

  const verifyEmail = async (email, code) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });
    if (error) throw error;
    return data;
  };

  const resendVerificationCode = async (email) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return data;
  };

  const forgotPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email, code, password) => {
    // For Supabase, resetting password usually involves a code/token
    // that redirects to a site. If using OTP for reset:
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (verifyError) throw verifyError;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: password,
    });
    if (updateError) throw updateError;
    return updateData;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, token: session?.access_token, login, register, verifyEmail,
      resendVerificationCode, forgotPassword, resetPassword, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
