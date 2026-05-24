"use client";

import { BarChart3, Bot, FileText, History, KeyRound, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredAdminToken } from "../api-client";

const items = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/prompts", label: "Prompts", icon: FileText },
  { href: "/admin/models", label: "Modelos", icon: SlidersHorizontal },
  { href: "/admin/executions", label: "Execucoes", icon: History },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="topbar">
      <Link href="/admin" className="brand">
        <Bot size={20} />
        <span>CPJ Cobranca AI</span>
      </Link>
      <nav className="nav-links" aria-label="Admin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        className="icon-button"
        type="button"
        title="Trocar token"
        onClick={() => {
          clearStoredAdminToken();
          router.refresh();
          window.location.reload();
        }}
      >
        <KeyRound size={16} />
      </button>
    </header>
  );
}
