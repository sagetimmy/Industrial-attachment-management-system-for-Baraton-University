import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        return;
      }
      if (session) {
        fetchUserProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Response data:', error.response?.data);

      // Only sign out if it's a 401 AND there's genuinely no valid session
      if (error.response?.status === 401) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setUser(null);
        } else {
          // Session exists but backend rejected — likely a backend issue, don't boot the user
          console.warn('Backend returned 401 but session exists — check /auth/me on backend');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const register = async (formData) => {
    try {
      const { data: { auth_id } } = await api.post('/auth/register', {
        email:     formData.email,
        password:  formData.password,
        role:      formData.role,
        full_name: formData.full_name || '',
      });

      const profileRes = await api.post('/auth/register-profile', {
        ...formData,
        auth_id,
      });

      return profileRes.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      throw new Error(message);
    }
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
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'recovery',
    });
    if (verifyError) throw verifyError;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;
    return updateData;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      session,
      token: session?.access_token,
      login,
      register,
      verifyEmail,
      resendVerificationCode,
      forgotPassword,
      resetPassword,
      logout,
      fetchUserProfile,
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