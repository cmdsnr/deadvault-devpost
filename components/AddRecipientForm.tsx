"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Recipient } from "@/lib/firestore";
import toast from "react-hot-toast";

interface AddRecipientFormProps {
  existingEmails?: string[];
  onAdded?: (recipient: Recipient) => void;
}

export default function AddRecipientForm({ existingEmails = [], onAdded }: AddRecipientFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (existingEmails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      toast.error("This executer has already been added");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/add-recipient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          relationship,
          userId: user.uid,
          ownerName: user.displayName ?? user.email ?? "Unknown",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add executer");
      }

      const result = await res.json();

      const record: Recipient = {
        id: result.id,
        name: result.name,
        email: result.email,
        relationship: result.relationship,
        claimToken: result.claimToken,
        addedAt: result.addedAt,
      };

      toast.success("Executer added successfully");
      setName("");
      setEmail("");
      setRelationship("");
      onAdded?.(record);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add executer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-card-border bg-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserPlus className="h-4 w-4 text-primary" />
        Add Executer
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="rec-name" className="mb-1 block text-xs font-medium text-muted">
            Full Name
          </label>
          <input
            id="rec-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="block w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="rec-email" className="mb-1 block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="rec-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="block w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="rec-rel" className="mb-1 block text-xs font-medium text-muted">
            Relationship
          </label>
          <input
            id="rec-rel"
            type="text"
            required
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Spouse, sibling, etc."
            className="block w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Add Executer
      </button>
    </form>
  );
}
