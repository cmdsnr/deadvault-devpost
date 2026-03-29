"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Mail, Smartphone, KeyRound, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { setUserTwoFactor, store2faCode, verify2faCode } from "@/lib/firestore";
import { getClientAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import TotpSetup from "@/components/TotpSetup";
import toast from "react-hot-toast";

type Method = "email" | "sms" | "totp" | null;

export default function Setup2faPage() {
  const { user, complete2fa } = useAuth();
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<Method>(null);
  const [code, setCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const smsConfirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  async function sendEmailCode() {
    if (!user) return;
    setSending(true);
    setError("");
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await store2faCode(user.uid, otp, "email");

      const res = await fetch("/api/2fa/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, code: otp }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setCodeSent(true);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      setError(err.message ?? "Failed to send code");
    } finally {
      setSending(false);
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setVerifying(true);
    setError("");
    try {
      const valid = await verify2faCode(user.uid, code);
      if (!valid) throw new Error("Invalid or expired code");

      await setUserTwoFactor(user.uid, "email");
      complete2fa();
      toast.success("Email 2FA enabled");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Invalid code");
    } finally {
      setVerifying(false);
    }
  }

  async function handleTotpComplete(secret: string) {
    if (!user) return;
    await setUserTwoFactor(user.uid, "totp", { totpSecret: secret });
    complete2fa();
    toast.success("Authenticator 2FA enabled");
    router.push("/dashboard");
  }

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

  async function sendSmsCode() {
    if (!user || !phoneNumber.trim()) return;
    setSending(true);
    setError("");
    try {
      const auth = getClientAuth();
      const verifier = getRecaptchaVerifier();
      const normalized = normalizePhone(phoneNumber);
      const confirmation = await signInWithPhoneNumber(auth, normalized, verifier);
      smsConfirmationRef.current = confirmation;
      setCodeSent(true);
      toast.success("Verification code sent via SMS");
    } catch (err: any) {
      setError(err.message ?? "Failed to send SMS code");
      recaptchaVerifierRef.current = null;
    } finally {
      setSending(false);
    }
  }

  async function verifySmsCode(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !smsConfirmationRef.current) return;
    setVerifying(true);
    setError("");
    try {
      await smsConfirmationRef.current.confirm(code);
      await setUserTwoFactor(user.uid, "sms", { phoneNumber: normalizePhone(phoneNumber) });
      complete2fa();
      toast.success("SMS 2FA enabled");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.code === "auth/invalid-verification-code" ? "Invalid code. Please try again." : (err.message ?? "Verification failed"));
    } finally {
      setVerifying(false);
    }
  }

  const methods = [
    {
      id: "email" as const,
      icon: Mail,
      title: "Email Verification",
      description: "Receive a 6-digit code via email each time you sign in",
    },
    {
      id: "totp" as const,
      icon: KeyRound,
      title: "Google Authenticator",
      description: "Use an authenticator app to generate verification codes",
    },
    {
      id: "sms" as const,
      icon: Smartphone,
      title: "SMS Verification",
      description: "Receive a 6-digit code via text message",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Two-Factor Authentication</h1>
          <p className="mt-2 text-sm text-muted">
            Add an extra layer of security to your vault
          </p>
        </div>

        {!selectedMethod && (
          <div className="space-y-3">
            {methods.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                onClick={() => setSelectedMethod(id)}
                className="flex w-full items-start gap-4 rounded-xl border border-card-border bg-card p-5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted">{description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedMethod && (
          <button
            onClick={() => {
              setSelectedMethod(null);
              setCodeSent(false);
              setCode("");
              setError("");
              smsConfirmationRef.current = null;
            }}
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Choose a different method
          </button>
        )}

        {selectedMethod === "email" && (
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              Email Verification
            </h3>

            {error && (
              <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {!codeSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  We&apos;ll send a 6-digit verification code to{" "}
                  <span className="font-medium text-foreground">{user?.email}</span>
                </p>
                <button
                  onClick={sendEmailCode}
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send Code
                </button>
              </div>
            ) : (
              <form onSubmit={verifyEmailCode} className="space-y-4">
                <p className="text-sm text-muted">
                  Enter the 6-digit code sent to your email
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Verify & Enable
                </button>
                <button
                  type="button"
                  onClick={sendEmailCode}
                  disabled={sending}
                  className="w-full text-center text-sm text-primary hover:text-primary-hover"
                >
                  Resend code
                </button>
              </form>
            )}
          </div>
        )}

        {selectedMethod === "totp" && (
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <KeyRound className="h-5 w-5 text-primary" />
              Google Authenticator
            </h3>
            <TotpSetup onComplete={handleTotpComplete} />
          </div>
        )}

        {selectedMethod === "sms" && (
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Smartphone className="h-5 w-5 text-primary" />
              SMS Verification
            </h3>

            {error && (
              <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
            )}

            {!codeSent ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Include country code (e.g. +1 for US/Canada)
                  </p>
                </div>
                <button
                  onClick={sendSmsCode}
                  disabled={sending || !phoneNumber.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Send Code
                </button>
              </div>
            ) : (
              <form onSubmit={verifySmsCode} className="space-y-4">
                <p className="text-sm text-muted">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-foreground">{phoneNumber}</span>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Verify & Enable
                </button>
                <button
                  type="button"
                  onClick={sendSmsCode}
                  disabled={sending}
                  className="w-full text-center text-sm text-primary hover:text-primary-hover"
                >
                  {sending ? "Sending..." : "Resend code"}
                </button>
              </form>
            )}
          </div>
        )}

        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
