"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getClientAuth, firebaseConfigured } from "@/lib/firebase";
import { getUserTwoFactorInfo } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  pending2fa: boolean;
  needs2faSetup: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  complete2fa: () => void;
  check2faStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending2fa, setPending2fa] = useState(false);
  const [needs2faSetup, setNeeds2faSetup] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const a = getClientAuth();
    const unsubscribe = onAuthStateChanged(a, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const check2faStatus = useCallback(async () => {
    if (!user) return;
    try {
      const info = await getUserTwoFactorInfo(user.uid);
      if (info.twoFactorEnabled) {
        setPending2fa(true);
        setNeeds2faSetup(false);
      } else {
        setPending2fa(false);
        setNeeds2faSetup(true);
      }
    } catch {
      setNeeds2faSetup(true);
    }
  }, [user]);

  async function signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(getClientAuth(), email, password);
    const info = await getUserTwoFactorInfo(cred.user.uid);
    if (info.twoFactorEnabled) {
      setPending2fa(true);
      setNeeds2faSetup(false);
    } else {
      setPending2fa(false);
      setNeeds2faSetup(true);
    }
  }

  async function signUp(email: string, password: string) {
    await createUserWithEmailAndPassword(getClientAuth(), email, password);
    setNeeds2faSetup(true);
    setPending2fa(false);
  }

  async function handleGoogleSignIn() {
    const cred = await signInWithPopup(getClientAuth(), googleProvider);
    const info = await getUserTwoFactorInfo(cred.user.uid);
    if (info.twoFactorEnabled) {
      setPending2fa(true);
      setNeeds2faSetup(false);
    } else {
      setPending2fa(false);
      setNeeds2faSetup(true);
    }
  }

  function complete2fa() {
    setPending2fa(false);
    setNeeds2faSetup(false);
  }

  async function signOut() {
    await firebaseSignOut(getClientAuth());
    setPending2fa(false);
    setNeeds2faSetup(false);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: firebaseConfigured,
        pending2fa,
        needs2faSetup,
        signIn,
        signUp,
        signInWithGoogle: handleGoogleSignIn,
        signOut,
        complete2fa,
        check2faStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
