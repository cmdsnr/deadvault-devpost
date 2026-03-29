"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar, { type DashboardSection } from "@/components/Sidebar";

import FileUpload from "@/components/FileUpload";
import FileList from "@/components/FileList";
import AddFileRecipientForm from "@/components/AddFileRecipientForm";
import FileRecipientList from "@/components/FileRecipientList";
import RecipientList from "@/components/RecipientList";
import AddRecipientForm from "@/components/AddRecipientForm";
import AuditLog from "@/components/AuditLog";
import type { VaultFile, FileRecipient, Executer, AuditEntry } from "@/lib/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<DashboardSection>("vault");

  const [files, setFiles] = useState<VaultFile[]>([]);
  const [fileRecipients, setFileRecipients] = useState<FileRecipient[]>([]);
  const [executers, setExecuters] = useState<Executer[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingFileRecipients, setLoadingFileRecipients] = useState(true);
  const [loadingExecuters, setLoadingExecuters] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/vault-files?userId=${user.uid}`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch {
      setFiles([]);
    }
    setLoadingFiles(false);
  }, [user]);

  const addLocalFile = useCallback((file: VaultFile) => {
    setFiles((prev) => [file, ...prev]);
  }, []);

  const removeLocalFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const assignFileLocally = useCallback(
    (fileId: string, recipientId: string | null, recipientName: string | null) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, recipientId: recipientId ?? undefined, recipientName: recipientName ?? undefined } : f))
      );
    },
    []
  );

  const fetchFileRecipients = useCallback(async () => {
    if (!user) return;
    setLoadingFileRecipients(true);
    try {
      const res = await fetch(`/api/file-recipients?userId=${user.uid}`);
      const data = await res.json();
      setFileRecipients(data.recipients ?? []);
    } catch {
      setFileRecipients([]);
    }
    setLoadingFileRecipients(false);
  }, [user]);

  const addLocalFileRecipient = useCallback((r: FileRecipient) => {
    setFileRecipients((prev) => [r, ...prev]);
  }, []);

  const removeLocalFileRecipient = useCallback((id: string) => {
    setFileRecipients((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const fetchExecuters = useCallback(async () => {
    if (!user) return;
    setLoadingExecuters(true);
    try {
      const res = await fetch(`/api/recipients?userId=${user.uid}`);
      const data = await res.json();
      setExecuters(data.recipients ?? []);
    } catch {
      setExecuters([]);
    }
    setLoadingExecuters(false);
  }, [user]);

  const addLocalExecuter = useCallback((e: Executer) => {
    setExecuters((prev) => [e, ...prev]);
  }, []);

  const removeLocalExecuter = useCallback((id: string) => {
    setExecuters((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const fetchAudit = useCallback(async () => {
    if (!user) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/audit-log?userId=${user.uid}`);
      const data = await res.json();
      setAuditEntries(data.entries ?? []);
    } catch {
      setAuditEntries([]);
    }
    setLoadingAudit(false);
  }, [user]);

  useEffect(() => {
    fetchFiles();
    fetchFileRecipients();
    fetchExecuters();
    fetchAudit();
  }, [fetchFiles, fetchFileRecipients, fetchExecuters, fetchAudit]);

  return (
    <>
      <Sidebar active={section} onChange={setSection} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">
              {section === "vault" && "My Vault"}
              {section === "recipients" && "Recipients"}
              {section === "executers" && "Executers"}
              {section === "audit" && "Audit Log"}
            </h1>
          </div>

          <div className="space-y-6">
            {section === "vault" && (
              <>
                <FileUpload onUploadComplete={addLocalFile} />
                <FileList
                  files={files}
                  fileRecipients={fileRecipients}
                  loading={loadingFiles}
                  onDelete={removeLocalFile}
                  onAssign={assignFileLocally}
                />
              </>
            )}

            {section === "recipients" && (
              <>
                <AddFileRecipientForm
                  existingEmails={fileRecipients.map((r) => r.email)}
                  onAdded={addLocalFileRecipient}
                />
                <FileRecipientList
                  recipients={fileRecipients}
                  loading={loadingFileRecipients}
                  onRemove={removeLocalFileRecipient}
                />
              </>
            )}

            {section === "executers" && (
              <>
                <AddRecipientForm
                  existingEmails={executers.map((e) => e.email)}
                  onAdded={addLocalExecuter}
                />
                <RecipientList
                  recipients={executers}
                  loading={loadingExecuters}
                  onRemove={removeLocalExecuter}
                />
              </>
            )}

            {section === "audit" && (
              <AuditLog entries={auditEntries} loading={loadingAudit} />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
