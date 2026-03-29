"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, pending2fa, needs2faSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!configured) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (pending2fa) {
      router.replace("/verify-2fa");
      return;
    }
    if (needs2faSetup) {
      router.replace("/setup-2fa");
      return;
    }
  }, [user, loading, configured, pending2fa, needs2faSetup, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!configured) return <>{children}</>;
  if (!user || pending2fa || needs2faSetup) return null;

  return <>{children}</>;
}
