"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Shield, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  return (
    <nav className="border-b border-card-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Shield className="h-6 w-6 text-primary" />
          DeadVault
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                <Avatar src={user.photoURL} name={displayName} size="sm" userId={user.uid} />
                <span className="text-sm font-medium text-foreground">{displayName}</span>
              </div>

              <Link
                href="/settings"
                className="rounded-lg p-2 text-muted transition-colors hover:bg-card-border hover:text-foreground"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-card-border hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm text-muted transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
