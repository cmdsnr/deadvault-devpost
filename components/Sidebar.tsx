"use client";

import { FolderLock, Users, UserCheck, ScrollText, ShieldCheck, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const navItems = [
  { id: "vault", label: "My Vault", icon: FolderLock },
  { id: "recipients", label: "Recipients", icon: Users },
  { id: "executers", label: "Executers", icon: UserCheck },
  { id: "audit", label: "Audit Log", icon: ScrollText },
] as const;

export type DashboardSection = (typeof navItems)[number]["id"];

interface SidebarProps {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSelect(section: DashboardSection) {
    onChange(section);
    setMobileOpen(false);
  }

  const nav = (
    <>
      <div className="flex items-center gap-2 border-b border-card-border px-5 py-4">
        <ShieldCheck className="h-5 w-5 text-success" />
        <span className="text-sm font-medium text-foreground">Vault Active</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active === id
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-card-border/50 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="border-t border-card-border px-3 py-3">
        <Link
          href="/settings"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card-border/50 hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-card-border bg-card transition-transform md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-card-border bg-card md:flex">
        {nav}
      </aside>
    </>
  );
}
