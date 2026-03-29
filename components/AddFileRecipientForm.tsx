"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { FileRecipient } from "@/lib/firestore";
import toast from "react-hot-toast";

interface AddFileRecipientFormProps {
  existingEmails?: string[];
  onAdded?: (recipient: FileRecipient) => void;
}

export default function AddFileRecipientForm({ existingEmails = [], onAdded }: AddFileRecipientFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (existingEmails.some((e) => e.toLowerCase() === email.toLowerCase())) {
      toast.error("This recipient has already been added");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/file-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, userId: user.uid }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add recipient");
      }

      const result = await res.json();
      toast.success("Recipient added");
      setName("");
      setEmail("");
      onAdded?.({ id: result.id, name: result.name, email: result.email, addedAt: result.addedAt });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add recipient");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-card-border bg-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <UserPlus className="h-4 w-4 text-primary" />
        Add Recipient
      </h3>
      <p className="mb-4 text-xs text-muted">
        Recipients are the people who will receive your vault files when released.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fr-name" className="mb-1 block text-xs font-medium text-muted">
            Full Name
          </label>
          <input
            id="fr-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="block w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label htmlFor="fr-email" className="mb-1 block text-xs font-medium text-muted">
            Email
          </label>
          <input
            id="fr-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
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
        Add Recipient
      </button>
    </form>
  );
}
