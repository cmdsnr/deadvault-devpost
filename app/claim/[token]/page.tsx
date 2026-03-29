"use client";

import { useState, useEffect, use } from "react";
import { Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import ClaimForm from "@/components/ClaimForm";
import Link from "next/link";

export default function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ownerInfo, setOwnerInfo] = useState<{ ownerName: string; recipientName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/claim-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!data.found) {
          setInvalid(true);
        } else {
          setOwnerInfo({ ownerName: data.ownerName, recipientName: data.recipientName });
        }
      } catch {
        setInvalid(true);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-danger" />
          <h1 className="text-2xl font-bold text-foreground">Invalid Claim Link</h1>
          <p className="text-muted">
            This claim link is invalid or has expired. Please contact the vault owner for a new link.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-border"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <h1 className="text-2xl font-bold text-foreground">Vault Released</h1>
          <p className="text-muted">
            The physician&apos;s license has been verified and the vault files have been
            released to the designated recipients. They will receive an email with
            download links.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">DeadVault Claim</h1>
          <p className="mt-2 text-muted">
            You are submitting a claim for{" "}
            <span className="font-medium text-foreground">{ownerInfo?.ownerName}</span>&apos;s vault
          </p>
        </div>

        <ClaimForm
          token={token}
          ownerName={ownerInfo?.ownerName ?? ""}
          onSubmitted={() => setSubmitted(true)}
        />

        <p className="text-center text-xs text-muted">
          Submitting a false claim is a serious matter. All claims are verified and logged.
        </p>
      </div>
    </div>
  );
}
