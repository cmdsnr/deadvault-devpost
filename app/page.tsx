"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Shield, Upload, KeyRound, Lock, FileCheck, UserCheck, Users } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload & Encrypt",
    description: "Upload your important documents. They're encrypted with Google Cloud KMS and stored securely.",
  },
  {
    icon: Users,
    title: "Assign Recipients & Executers",
    description: "Designate who receives your files and who can execute a claim to release them.",
  },
  {
    icon: KeyRound,
    title: "Rest Easy",
    description: "Executers submit a verified physician's note to unlock your vault. You can override any false claims.",
  },
];

const features = [
  {
    icon: Lock,
    title: "Envelope Encryption",
    description: "Files are encrypted using Google Cloud KMS envelope encryption before storage.",
  },
  {
    icon: FileCheck,
    title: "Physician Verification",
    description: "Claims require a physician's note with a license verified against public registries.",
  },
  {
    icon: UserCheck,
    title: "Instant Verified Release",
    description: "Once a physician's license is verified, vault files are immediately released to designated recipients via secure signed URLs.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Secure Your
            <br />
            <span className="text-primary">Digital Legacy</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted">
            Most people have no plan for what happens to their accounts, passwords, and
            important files when they&apos;re gone. DeadVault changes that.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Create Your Vault
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-card-border px-8 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-card"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-card-border bg-card/50 px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">How It Works</h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-muted">
            Three simple steps to ensure your digital legacy is protected.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="relative rounded-xl border border-card-border bg-card p-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground">Built for Security</h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-muted">
            Every layer is designed to protect your data and prevent unauthorized access.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-xl border border-card-border bg-card p-8">
                <Icon className="mb-4 h-6 w-6 text-primary" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-card-border px-4 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Shield className="h-4 w-4" />
            DeadVault
          </div>
          <p className="text-sm text-muted">LCS Hack to the Future 2026</p>
        </div>
      </footer>
    </div>
  );
}
