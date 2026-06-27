"use client";

import Link from "next/link";
import {
  Building2,
  Calendar,
  ClipboardList,
  FileCheck,
  FileWarning,
  GitBranch,
  List,
  Plus,
  Shield,
  Tag,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/** Noms d'icônes sérialisables (Server → Client). */
export type SectionQuickLinkIcon =
  | "tag"
  | "plus"
  | "users"
  | "git-branch"
  | "user-plus"
  | "list"
  | "building-2"
  | "file-check"
  | "shield"
  | "clipboard-list"
  | "calendar"
  | "file-warning";

const ICONS: Record<SectionQuickLinkIcon, LucideIcon> = {
  tag: Tag,
  plus: Plus,
  users: Users,
  "git-branch": GitBranch,
  "user-plus": UserPlus,
  list: List,
  "building-2": Building2,
  "file-check": FileCheck,
  shield: Shield,
  "clipboard-list": ClipboardList,
  calendar: Calendar,
  "file-warning": FileWarning,
};

export type SectionQuickLink = {
  href: string;
  title: string;
  description: string;
  icon: SectionQuickLinkIcon;
  accent?: string;
};

export function SectionQuickLinks({ links }: { links: SectionQuickLink[] }) {
  const { canHref } = useAuth();
  const visible = links.filter((link) => canHref(link.href));

  if (visible.length === 0) return null;

  return (
    <div className="grid w-full gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
      {visible.map((link) => {
        const Icon = ICONS[link.icon];
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex h-full flex-col rounded-xl border border-[var(--shell-border)] bg-[var(--shell-card)] p-4 transition hover:border-sky-500/40 hover:bg-sky-500/5"
          >
            <Icon className={`h-5 w-5 mb-2 ${link.accent ?? "text-sky-400"}`} />
            <p className="font-semibold text-[var(--shell-text)]">{link.title}</p>
            <p className="text-xs text-[var(--shell-text-muted)] mt-1">{link.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
