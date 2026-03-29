"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getUserTwoFactorInfo, type TwoFactorInfo } from "@/lib/firestore";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Mail,
  Smartphone,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  User as UserIcon,
  Camera,
  Pencil,
} from "lucide-react";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [twoFaInfo, setTwoFaInfo] = useState<TwoFactorInfo | null>(null);
  const [loadingTwoFa, setLoadingTwoFa] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const isPasswordUser = user?.providerData?.some((p) => p.providerId === "password");

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    setPhotoPreview(user.photoURL ?? null);
    getUserTwoFactorInfo(user.uid).then((info) => {
      setTwoFaInfo(info);
      setLoadingTwoFa(false);
    });
  }, [user]);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setNameLoading(true);
    try {
      await updateProfile(user, { displayName: trimmed });
      toast.success("Display name updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update name");
    } finally {
      setNameLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    setPhotoUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.uid);

      const res = await fetch("/api/upload-avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const { downloadUrl } = await res.json();

      const absoluteUrl = downloadUrl.startsWith("/")
        ? `${window.location.origin}${downloadUrl}`
        : downloadUrl;
      await updateProfile(user, { photoURL: absoluteUrl });
      setPhotoPreview(absoluteUrl);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload photo");
      setPhotoPreview(user.photoURL ?? null);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    setPwLoading(true);
    try {
      const auth = getClientAuth();
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error("Not signed in");

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg =
        err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Current password is incorrect"
          : err.message ?? "Failed to update password";
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  const methodLabels: Record<string, { label: string; icon: typeof Mail }> = {
    email: { label: "Email Verification", icon: Mail },
    sms: { label: "SMS Verification", icon: Smartphone },
    totp: { label: "Google Authenticator", icon: KeyRound },
  };

  const currentMethod = twoFaInfo?.twoFactorMethod ?? null;
  const MethodIcon = currentMethod ? methodLabels[currentMethod]?.icon ?? ShieldCheck : ShieldCheck;

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-card-border hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Profile */}
        <div className="rounded-xl border border-card-border bg-card p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
            <UserIcon className="h-5 w-5 text-primary" />
            Profile
          </h2>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative shrink-0">
              <Avatar
                src={photoPreview}
                name={user?.displayName ?? user?.email?.split("@")[0] ?? "U"}
                size="lg"
                userId={user?.uid}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-card-border text-foreground transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
              >
                {photoUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Name */}
            <form onSubmit={handleUpdateName} className="flex-1 space-y-3">
              <div>
                <label htmlFor="display-name" className="mb-1 block text-sm font-medium text-foreground">
                  Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    id="display-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full rounded-lg border border-card-border bg-background px-4 py-2.5 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Your name"
                  />
                  <button
                    type="submit"
                    disabled={nameLoading || displayName.trim() === (user?.displayName ?? "")}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    {nameLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    Save
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted">
                {user?.email}
              </p>
            </form>
          </div>
        </div>

        {/* Change 2FA Method */}
        <div className="rounded-xl border border-card-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </h2>

          {loadingTwoFa ? (
            <div className="flex items-center gap-2 py-4 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : currentMethod ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-card-border bg-background p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                    <MethodIcon className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {methodLabels[currentMethod]?.label ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted">Currently active</p>
                  </div>
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  Enabled
                </span>
              </div>
              <button
                onClick={() => router.push("/setup-2fa")}
                className="flex items-center gap-2 rounded-lg border border-card-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-border/50"
              >
                <ShieldCheck className="h-4 w-4" />
                Change 2FA Method
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted">You haven&apos;t set up two-factor authentication yet.</p>
              <button
                onClick={() => router.push("/setup-2fa")}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                <ShieldCheck className="h-4 w-4" />
                Set Up 2FA
              </button>
            </div>
          )}
        </div>

        {/* Change Password */}
        {isPasswordUser && (
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwError && (
                <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{pwError}</div>
              )}

              <div>
                <label htmlFor="current-pw" className="mb-1 block text-sm font-medium text-foreground">
                  Current Password
                </label>
                <input
                  id="current-pw"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="new-pw" className="mb-1 block text-sm font-medium text-foreground">
                  New Password
                </label>
                <input
                  id="new-pw"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirm-pw" className="mb-1 block text-sm font-medium text-foreground">
                  Confirm New Password
                </label>
                <input
                  id="confirm-pw"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Update Password
              </button>
            </form>
          </div>
        )}

        {!isPasswordUser && (
          <div className="rounded-xl border border-card-border bg-card p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              Password
            </h2>
            <p className="text-sm text-muted">
              You signed in with Google. Password management is handled through your Google account.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
