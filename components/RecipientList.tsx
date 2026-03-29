"use client";

import { Users, Copy, Trash2 } from "lucide-react";
import type { Recipient } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface RecipientListProps {
  recipients: Recipient[];
  loading?: boolean;
  onRemove?: (id: string) => void;
}

export default function RecipientList({ recipients, loading, onRemove }: RecipientListProps) {
  const { user } = useAuth();

  function copyClaimLink(token: string) {
    const url = `${window.location.origin}/claim/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Claim link copied to clipboard");
  }

  async function handleRemove(recipient: Recipient) {
    if (!user) return;
    try {
      const res = await fetch("/api/recipients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, recipientId: recipient.id }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      onRemove?.(recipient.id);
      toast.success(`Removed ${recipient.name}`);
    } catch {
      toast.error("Failed to remove executer");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-card-border/30" />
        ))}
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card p-12 text-center">
        <Users className="h-10 w-10 text-muted/50" />
        <div>
          <p className="font-medium text-foreground">No executers yet</p>
          <p className="mt-1 text-sm text-muted">Add an executer to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-card-border">
      <table className="w-full">
        <thead>
          <tr className="border-b border-card-border bg-card">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Relationship
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {recipients.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-card/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground">{r.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-muted">{r.email}</td>
              <td className="px-4 py-3 text-sm text-muted capitalize">{r.relationship}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => copyClaimLink(r.claimToken)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Copy className="h-3 w-3" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleRemove(r)}
                    className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Remove executer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
