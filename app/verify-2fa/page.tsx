"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getUserTwoFactorInfo, store2faCode, verify2faCode, type TwoFactorInfo } from "@/lib/firestore";
import { getClientAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Shield, Mail, Smartphone, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import * as OTPAuth from "otpauth";
import toast from "react-hot-toast";

export default function Verify2faPage() {
  const { user, complete2fa, needs2faSetup } = useAuth();
  const router = useRouter();
  const [twoFaInfo, setTwoFaInfo] = useState<TwoFactorInfo | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const smsConfirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const smsSentRef = useRef(false);

  function getRecaptchaVerifier() {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }
    const auth = getClientAuth();
    const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    recaptchaVerifierRef.current = verifier;
    return verifier;
  }

  function normalizePhone(raw: string): string {
    const digits = raw.replace(/[^\d]/g, "");
    return "+" + digits;
  }

  const sendSmsCode = useCallback(async (phone: string) => {
    setSending(true);
    try {
      const auth = getClientAuth();
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      const normalized = normalizePhone(phone);
      const confirmation = await signInWithPhoneNumber(auth, normalized, recaptchaVerifierRef.current);
      smsConfirmationRef.current = confirmation;
      toast.success("Verification code sent via SMS");
    } catch (err: any) {
      console.error("SMS send error:", err);
      recaptchaVerifierRef.current = null;
    } finally {
      setSending(false);
    }
  }, []);

  const sendEmailCode = useCallback(async (userId: string, email: string) => {
    setSending(true);
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await store2faCode(userId, otp, "email");

      const res = await fetch("/api/2fa/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      // Don't block the page if email sending fails
    } finally {
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (needs2faSetup) {
      router.replace("/setup-2fa");
      return;
    }
    async function load() {
      const info = await getUserTwoFactorInfo(user!.uid);
      if (!info.twoFactorEnabled) {
        router.replace("/setup-2fa");
        return;
      }
      setTwoFaInfo(info);
      setLoading(false);

      if (info.twoFactorMethod === "email") {
        sendEmailCode(user!.uid, user!.email!);
      }

      if (info.twoFactorMethod === "sms" && info.phoneNumber && !smsSentRef.current) {
        smsSentRef.current = true;
        setTimeout(() => sendSmsCode(info.phoneNumber!), 500);
      }
    }
    load();
  }, [user, needs2faSetup, router, sendEmailCode, sendSmsCode]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !twoFaInfo) return;
    setVerifying(true);
    setError("");
    try {
      const method = twoFaInfo.twoFactorMethod;

      if (method === "totp") {
        const { doc, getDoc } = await import("firebase/firestore");
        const { getClientDb } = await import("@/lib/firebase");
        const db = getClientDb();
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const secret = userDoc.data()?.totpSecret;
        if (!secret) throw new Error("TOTP not configured");

        const totp = new OTPAuth.TOTP({ secret, digits: 6, period: 30 });
        const delta = totp.validate({ token: code, window: 1 });
        if (delta === null) throw new Error("Invalid code");
      } else if (method === "sms") {
        if (!smsConfirmationRef.current) {
          throw new Error("SMS verification not ready. Please click Resend code.");
        }
        await smsConfirmationRef.current.confirm(code);
      } else {
        const valid = await verify2faCode(user.uid, code);
        if (!valid) throw new Error("Invalid or expired code");
      }

      complete2fa();
      toast.success("Verified successfully");
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err.code === "auth/invalid-verification-code"
        ? "Invalid code. Please try again."
        : (err.message ?? "Invalid code");
      setError(msg);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendSms() {
    if (!twoFaInfo?.phoneNumber) return;
    recaptchaVerifierRef.current = null;
    await sendSmsCode(twoFaInfo.phoneNumber);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const methodIcon = {
    email: Mail,
    sms: Smartphone,
    totp: KeyRound,
  };
  const methodLabel = {
    email: "Email Verification",
    sms: "SMS Verification",
    totp: "Google Authenticator",
  };
  const methodHint = {
    email: "Enter the 6-digit code sent to your email",
    sms: "Enter the 6-digit code sent to your phone",
    totp: "Enter the 6-digit code from your authenticator app",
  };

  const method = twoFaInfo?.twoFactorMethod ?? "email";
  const Icon = methodIcon[method];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Two-Factor Verification</h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-sm text-muted">
            <Icon className="h-4 w-4" />
            {methodLabel[method]}
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-card p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <p className="text-center text-sm text-muted">{methodHint[method]}</p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
              className="block w-full rounded-lg border border-card-border bg-background px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verify
            </button>
          </form>

          {method === "email" && (
            <button
              onClick={() => user && sendEmailCode(user.uid, user.email!)}
              disabled={sending}
              className="mt-4 w-full text-center text-sm text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend code"}
            </button>
          )}

          {method === "sms" && (
            <button
              onClick={handleResendSms}
              disabled={sending}
              className="mt-4 w-full text-center text-sm text-primary hover:text-primary-hover disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
