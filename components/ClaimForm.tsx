"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, Send } from "lucide-react";
import { submitClaim } from "@/lib/api";
import toast from "react-hot-toast";

interface ClaimFormProps {
  token: string;
  ownerName: string;
  onSubmitted: () => void;
}

export default function ClaimForm({ token, ownerName, onSubmitted }: ClaimFormProps) {
  const [physicianName, setPhysicianName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [verifiedPhysician, setVerifiedPhysician] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const licenseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLicenseChange(value: string) {
    setLicenseNumber(value);
    setLicenseStatus("idle");
    setVerifiedPhysician(null);

    if (licenseTimerRef.current) clearTimeout(licenseTimerRef.current);

    if (value.trim().length >= 3) {
      licenseTimerRef.current = setTimeout(async () => {
        setLicenseStatus("checking");
        try {
          const res = await fetch(`/api/verify-license?license=${encodeURIComponent(value.trim())}`);
          const data = await res.json();
          if (data.valid) {
            setLicenseStatus("valid");
            setVerifiedPhysician(`${data.physicianName} — ${data.registeredProvince}`);
          } else {
            setLicenseStatus("invalid");
          }
        } catch {
          setLicenseStatus("idle");
        }
      }, 600);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please upload a physician's note");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("physicianNote", file);
      formData.append("physicianName", physicianName);
      formData.append("licenseNumber", licenseNumber);
      formData.append("relationship", relationship);

      await submitClaim(token, formData);
      onSubmitted();
    } catch {
      toast.error("Failed to submit claim. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-card-border bg-card p-6">
        <h3 className="mb-1 text-lg font-semibold text-foreground">Claim Submission</h3>
        <p className="mb-6 text-sm text-muted">
          Submit a verified physician&apos;s note to initiate release of{" "}
          <span className="text-foreground">{ownerName}</span>&apos;s vault.
        </p>

        <div className="space-y-4">
          {/* Physician Note Upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Physician&apos;s Note (PDF)
            </label>
            {file ? (
              <div className="flex items-center justify-between rounded-lg border border-card-border bg-background p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm text-foreground">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded p-1 text-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-card-border px-4 py-6 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                Click to upload physician&apos;s note
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
              className="hidden"
            />
          </div>

          {/* Physician Name */}
          <div>
            <label htmlFor="physician-name" className="mb-1 block text-sm font-medium text-foreground">
              Physician Name
            </label>
            <input
              id="physician-name"
              type="text"
              required
              value={physicianName}
              onChange={(e) => setPhysicianName(e.target.value)}
              placeholder="Dr. John Smith"
              className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* License Number */}
          <div>
            <label htmlFor="license-number" className="mb-1 block text-sm font-medium text-foreground">
              Physician License Number
            </label>
            <input
              id="license-number"
              type="text"
              required
              value={licenseNumber}
              onChange={(e) => handleLicenseChange(e.target.value)}
              placeholder="e.g. 12345"
              className={`block w-full rounded-lg border bg-background px-4 py-3 text-foreground placeholder-muted focus:outline-none focus:ring-1 ${
                licenseStatus === "valid"
                  ? "border-green-500 focus:border-green-500 focus:ring-green-500"
                  : licenseStatus === "invalid"
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-card-border focus:border-primary focus:ring-primary"
              }`}
            />
            {licenseStatus === "checking" && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <Loader2 className="h-3 w-3 animate-spin" /> Verifying license...
              </p>
            )}
            {licenseStatus === "valid" && verifiedPhysician && (
              <p className="mt-1 text-xs text-green-600">
                Verified: {verifiedPhysician}
              </p>
            )}
            {licenseStatus === "invalid" && (
              <p className="mt-1 text-xs text-red-500">
                License not found in registry. Please check the number.
              </p>
            )}
            {licenseStatus === "idle" && (
              <p className="mt-1 text-xs text-muted">
                Will be verified against the College of Physicians &amp; Surgeons registry
              </p>
            )}
          </div>

          {/* Relationship */}
          <div>
            <label htmlFor="relationship" className="mb-1 block text-sm font-medium text-foreground">
              Your Relationship to the Deceased
            </label>
            <input
              id="relationship"
              type="text"
              required
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="e.g. Spouse, Child, Sibling"
              className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {loading ? "Submitting Claim..." : "Submit Claim"}
      </button>
    </form>
  );
}
