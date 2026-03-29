"use client";

import {
  Upload,
  FileWarning,
  ShieldOff,
  Send,
  UserPlus,
  ScrollText,
} from "lucide-react";
import type { AuditEntry } from "@/lib/firestore";

const iconMap: Record<string, typeof Upload> = {
  upload: Upload,
  claim_submitted: FileWarning,
  claim_override: ShieldOff,
  file_released: Send,
  recipient_added: UserPlus,
};

const colorMap: Record<string, string> = {
  upload: "text-primary bg-primary/10",
  claim_submitted: "text-warning bg-warning/10",
  claim_override: "text-danger bg-danger/10",
  file_released: "text-success bg-success/10",
  recipient_added: "text-primary bg-primary/10",
};

interface AuditLogProps {
  entries: AuditEntry[];
  loading?: boolean;
}

export default function AuditLog({ entries, loading }: AuditLogProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-card-border/30" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card p-12 text-center">
        <ScrollText className="h-10 w-10 text-muted/50" />
        <div>
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-1 text-sm text-muted">Activity will appear here as you use your vault</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const Icon = iconMap[entry.type] ?? ScrollText;
        const color = colorMap[entry.type] ?? "text-muted bg-card-border/30";
        return (
          <div
            key={entry.id}
            className="flex items-center gap-4 rounded-lg border border-card-border bg-card px-4 py-3"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{entry.message}</p>
            </div>
            <time className="shrink-0 text-xs text-muted">
              {new Date(entry.timestamp).toLocaleString()}
            </time>
          </div>
        );
      })}
    </div>
  );
}
