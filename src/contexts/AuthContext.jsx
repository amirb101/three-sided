import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  onIdTokenChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { SecurityService } from '../services/securityService';

const AuthContext = createContext(undefined);

/** Friendly messages for common Firebase Auth errors */
const authErrorMessage = (code) => {
  switch (code) {
    case 'auth/popup-closed-by-user': return 'Sign-in popup was closed.';
    case 'auth/cancelled-popup-request': return 'Another sign-in is in progress.';
    case 'auth/popup-blocked': return 'Popup blocked by the browser. Try again or disable the blocker.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    default: return 'Sign-in failed. Please try again.';
  }
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
};

/**
 * Props:
 *  - children: ReactNode
 *  - fallback?: ReactNode  (rendered while loading auth state)
 */
export const AuthProvider = ({ children, fallback = null }) => {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionWarning, setSessionWarning] = useState(false);
  const initialisedRef = useRef(false);

  // Initial persistence setup (once)
  useEffect(() => {
    // ensure persistence is set before auth state subscription stabilises
    setPersistence(auth, browserLocalPersistence).catch((e) => {
      // Not fatal; log for debugging
      console.warn('Auth persistence failed, falling back to default:', e);
    });
  }, []);

  // Keep user and token in sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Note: idToken listener below will set token soon after.
      if (!initialisedRef.current) {
        initialisedRef.current = true;
        setLoading(false);
      }
    });

    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken(/* forceRefresh */ false);
          setIdToken(token);
        } catch (e) {
          console.warn('Failed to get ID token:', e);
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  // Helper: get a fresh ID token on demand (e.g., before calling your API)
  const getFreshIdToken = async () => {
    if (!auth.currentUser) return null;
    try {
      const token = await auth.currentUser.getIdToken(true);
      setIdToken(token);
      return token;
    } catch (e) {
      console.warn('getFreshIdToken error:', e);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    // Optional: add scopes or fine-tune UX
    provider.setCustomParameters({
      // force account chooser each time
      prompt: 'select_account',
    });
    try {
      // Try popup first
      const res = await signInWithPopup(auth, provider);
      return res.user;
    } catch (e) {
      // Graceful fallback to redirect on popup issues
      if (
        e?.code === 'auth/popup-blocked' ||
        e?.code === 'auth/popup-closed-by-user' ||
        e?.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return null; // will resume after redirect
        } catch (e2) {
          setAuthError(authErrorMessage(e2.code));
          throw e2;
        }
      }
      setAuthError(authErrorMessage(e.code));
      throw e;
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch (e) {
      setAuthError('Error signing out. Please try again.');
      throw e;
    }
  };

  // Session security setup
  useEffect(() => {
    if (user) {
      const handleSessionWarning = () => {
        setSessionWarning(true);
      };
      
      const handleSessionTimeout = () => {
        alert('Your session has expired due to inactivity. Please sign in again.');
        logout();
      };
      
      SecurityService.setupActivityTracking(handleSessionWarning, handleSessionTimeout);
    }
  }, [user]);

  const dismissSessionWarning = () => {
    setSessionWarning(false);
    SecurityService.updateActivity();
  };

  const value = useMemo(() => ({
    user,
    idToken,
    loading,
    authError,
    sessionWarning,
    dismissSessionWarning,
    signInWithGoogle,
    logout,
    getFreshIdToken,
    // You can expose refreshUser() or linkWithPopup() here if needed
  }), [user, idToken, loading, authError, sessionWarning]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? fallback : children}
    </AuthContext.Provider>
  );
};