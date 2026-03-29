"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2 } from "lucide-react";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

interface TotpSetupProps {
  onComplete: (secret: string) => void;
}

export default function TotpSetup({ onComplete }: TotpSetupProps) {
  const { user } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [totpInstance, setTotpInstance] = useState<OTPAuth.TOTP | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    async function setup() {
      try {
        const secret = new OTPAuth.Secret();
        const totp = new OTPAuth.TOTP({
          issuer: "DeadVault",
          label: user!.email ?? "user",
          secret,
          digits: 6,
          period: 30,
        });

        const uri = totp.toString();
        const dataUrl = await QRCode.toDataURL(uri, {
          width: 256,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });

        setQrDataUrl(dataUrl);
        setSecretKey(secret.base32);
        setTotpInstance(totp);
      } catch (err: any) {
        setError(err.message ?? "Failed to set up authenticator");
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, [user]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !totpInstance) return;
    setError("");
    setVerifying(true);
    try {
      const delta = totpInstance.validate({ token: code, window: 1 });
      if (delta === null) {
        setError("Invalid code. Please try again.");
        setVerifying(false);
        return;
      }
      onComplete(secretKey);
    } catch (err: any) {
      setError(err.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted">
          Scan this QR code with Google Authenticator or any TOTP app
        </p>
      </div>

      {qrDataUrl && (
        <div className="flex justify-center">
          <div className="rounded-xl bg-white p-4">
            <img src={qrDataUrl} alt="TOTP QR Code" width={256} height={256} />
          </div>
        </div>
      )}

      {secretKey && (
        <div className="rounded-lg border border-card-border bg-background p-3 text-center">
          <p className="mb-1 text-xs text-muted">Or enter this key manually:</p>
          <code className="text-sm font-mono text-foreground tracking-wider">{secretKey}</code>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        )}
        <div>
          <label htmlFor="totp-code" className="mb-1 block text-sm font-medium text-foreground">
            Enter the 6-digit code from your app
          </label>
          <input
            id="totp-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="block w-full rounded-lg border border-card-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-foreground placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={verifying || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Verify & Enable
        </button>
      </form>
    </div>
  );
}
