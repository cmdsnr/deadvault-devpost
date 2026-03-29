"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { VaultFile } from "@/lib/firestore";
import toast from "react-hot-toast";

interface FileUploadProps {
  onUploadComplete?: (file: VaultFile) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  async function handleUpload() {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("userId", user.uid);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }
      const result = await res.json();

      const fileRecord: VaultFile = {
        id: result.id ?? crypto.randomUUID(),
        name: result.name ?? selectedFile.name,
        size: result.size ?? selectedFile.size,
        uploadedAt: result.uploadedAt ?? new Date().toISOString(),
        downloadUrl: result.downloadUrl,
        storagePath: result.storagePath,
      };

      toast.success("File uploaded successfully");
      setSelectedFile(null);
      onUploadComplete?.(fileRecord);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-card-border hover:border-muted"
        }`}
      >
        <Upload className={`h-8 w-8 ${dragActive ? "text-primary" : "text-muted"}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drag & drop a file here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted">
            Files are stored securely in Firebase Storage
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-lg border border-card-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted">{formatSize(selectedFile.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => setSelectedFile(null)}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-card-border hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
