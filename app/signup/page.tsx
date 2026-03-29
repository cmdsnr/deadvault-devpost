"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Loader2 } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password);
      router.push("/setup-2fa");
    } catch (err: any) {
      setError(err.message ?? "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/setup-2fa");
    } catch (err: any) {
      setError(err.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-foreground">
            <Shield className="h-8 w-8 text-primary" />
            DeadVault
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="space-y-6 rounded-xl border border-card-border bg-card p-8">
          {error && (
            <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create account
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-card-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-2 text-muted">or</span>
            </div>
          </div>

          <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} label="Sign up with Google" />
        </div>
      </div>
    </div>
  );
}
