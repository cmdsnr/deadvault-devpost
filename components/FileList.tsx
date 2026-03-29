"use client";

import { FileText, Trash2, Download } from "lucide-react";
import type { VaultFile, FileRecipient } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface FileListProps {
  files: VaultFile[];
  fileRecipients?: FileRecipient[];
  loading?: boolean;
  onDelete?: (fileId: string) => void;
  onAssign?: (fileId: string, recipientId: string | null, recipientName: string | null) => void;
}

export default function FileList({ files, fileRecipients = [], loading, onDelete, onAssign }: FileListProps) {
  const { user } = useAuth();

  async function handleDelete(file: VaultFile) {
    if (!user) return;
    try {
      await fetch("/api/vault-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          fileId: file.id,
          storagePath: file.storagePath,
        }),
      });
      onDelete?.(file.id);
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  }

  async function handleAssign(file: VaultFile, selectedId: string) {
    if (!user) return;
    const recipient = fileRecipients.find((r) => r.id === selectedId);
    const newName = recipient?.name ?? null;
    const newId = selectedId || null;

    try {
      const res = await fetch("/api/vault-files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          fileId: file.id,
          recipientId: newId,
          recipientName: newName,
        }),
      });
      if (!res.ok) throw new Error();
      onAssign?.(file.id, newId, newName);
      toast.success(newName ? `Assigned to ${newName}` : "Unassigned");
    } catch {
      toast.error("Failed to assign recipient");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-card-border/30" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-card p-12 text-center">
        <FileText className="h-10 w-10 text-muted/50" />
        <div>
          <p className="font-medium text-foreground">No files yet</p>
          <p className="mt-1 text-sm text-muted">Upload your first file to get started</p>
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
              File
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Recipient
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
              Uploaded
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {files.map((file) => (
            <tr key={file.id} className="transition-colors hover:bg-card/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm font-medium text-foreground">{file.fileName ?? file.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <select
                  value={file.recipientId ?? ""}
                  onChange={(e) => handleAssign(file, e.target.value)}
                  className="rounded-lg border border-card-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Unassigned</option>
                  {fileRecipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-sm text-muted">
                {new Date(file.uploadedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(file)}
                    className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Delete"
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
