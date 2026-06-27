"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  FileCheck,
  GitBranch,
  LayoutDashboard,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  FileText,
  ScrollText,
  Settings,
  Shield,
  UserPlus,
  UserCircle,
  UserCog,
  Users,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  GraduationCap,
  ClipboardCheck,
  Car,
  HeartPulse,
  CalendarClock,
  Hospital,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};
type NavAction = {
  action: "profile";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
type NavChild = NavLink | NavAction;
type NavGroup = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: NavChild[];
};

function isNavLink(child: NavChild): child is NavLink {
  return "href" in child;
}

const navigation: NavGroup[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, href: "/" },
  { id: "rapports", label: "Rapports RH", icon: FileText, href: "/rapports" },
  {
    id: "employes",
    label: "Employés",
    icon: Users,
    children: [
      { href: "/employes/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/employes/nouveau", label: "Nouvel employé", icon: UserPlus },
      { href: "/employes", label: "Liste", icon: List },
      { href: "/employes/departements", label: "Départements", icon: Building2 },
      { href: "/employes/checking-documents", label: "Checking document", icon: FileCheck },
      { href: "/mouvements", label: "Mouvements", icon: GitBranch },
      { href: "/employes/rapports", label: "Rapports", icon: FileText },
    ],
  },
  {
    id: "sante",
    label: "Santé",
    icon: HeartPulse,
    children: [
      { href: "/sante/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/sante/formulaire", label: "Formulaire", icon: ClipboardList },
      { href: "/sante/file-attente", label: "File d'attente", icon: List },
      { href: "/sante/hopitaux", label: "Hôpitaux", icon: Hospital },
      { href: "/sante/rapports", label: "Rapports", icon: FileText },
    ],
  },
  {
    id: "charroi",
    label: "Charroi automobile",
    icon: Car,
    children: [
      { href: "/charroi", label: "Dashboard", icon: LayoutDashboard },
      { href: "/charroi/vehicules", label: "Véhicule", icon: List },
      { href: "/charroi/planning", label: "Planning véhicule", icon: CalendarClock },
      { href: "/charroi/rapports", label: "Rapports", icon: FileText },
    ],
  },
  {
    id: "postes",
    label: "Poste",
    icon: Briefcase,
    children: [
      { href: "/postes", label: "Dashboard", icon: LayoutDashboard },
      { href: "/postes/nouvelle-fiche", label: "Nouvelle fiche de poste", icon: Briefcase },
      { href: "/postes/vacants", label: "Postes vacants", icon: Users },
      { href: "/postes/organigramme", label: "Organigramme", icon: GitBranch },
      { href: "/postes/rapports", label: "Rapports", icon: FileText },
    ],
  },
  {
    id: "paie",
    label: "Paie",
    icon: Calculator,
    children: [
      { href: "/paie", label: "Dashboard", icon: LayoutDashboard },
      { href: "/paie/exploitation", label: "Exploitation mensuelle", icon: ClipboardList },
      { href: "/paie/simulateur", label: "Simulateur paie", icon: Calculator },
      { href: "/paie/grille-couts-extra", label: "Grille des coûts extra", icon: FileCheck },
      { href: "/paie/bulletins", label: "Design Template", icon: Palette },
    ],
  },
  {
    id: "conges",
    label: "Congés",
    icon: CalendarDays,
    children: [
      { href: "/conges/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/conges/ajouter", label: "Ajouter congé", icon: CalendarPlus },
      { href: "/conges/gestion", label: "Gestion des congés", icon: ClipboardList },
    ],
  },
  {
    id: "pointage",
    label: "Pointage",
    icon: ClipboardCheck,
    children: [
      { href: "/pointage/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pointage/saisie", label: "Saisie", icon: CalendarPlus },
      { href: "/pointage/gestion", label: "Feuilles du mois", icon: ClipboardList },
      { href: "/pointage/rapports", label: "Rapports", icon: FileText },
    ],
  },
  {
    id: "formations",
    label: "Formations",
    icon: GraduationCap,
    children: [
      { href: "/formations/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/formations/nouvelle", label: "Nouvelle formation", icon: CalendarPlus },
      { href: "/formations/gestion", label: "Liste des formations", icon: ClipboardList },
    ],
  },
  { id: "configuration", label: "Configuration", icon: Settings, href: "/parametres" },
  { id: "juridique", label: "Guide RH RDC", icon: BookOpen, href: "/juridique" },
];

const bottomNavigation: NavGroup[] = [
  {
    id: "utilisateurs",
    label: "Utilisateurs",
    icon: UserCog,
    children: [
      { action: "profile", label: "Mon profil", icon: UserCircle },
      { href: "/utilisateurs/compte", label: "Compte", icon: UserCog },
      { href: "/utilisateurs/permissions", label: "Permissions", icon: Shield },
      { href: "/utilisateurs/logs", label: "Logs", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/employes") return pathname === "/employes";
  if (href === "/employes/dashboard") return pathname === "/employes/dashboard";
  if (href === "/employes/rapports") return pathname.startsWith("/employes/rapports");
  if (href === "/postes") return pathname === "/postes";
  if (href === "/postes/rapports") return pathname.startsWith("/postes/rapports");
  if (href === "/employes/checking-documents") return pathname.startsWith("/employes/checking-documents");
  if (href === "/mouvements") return pathname.startsWith("/mouvements");
  if (href === "/sante/dashboard") return pathname === "/sante/dashboard";
  if (href === "/sante/formulaire") return pathname === "/sante/formulaire";
  if (href === "/sante/file-attente") return pathname.startsWith("/sante/file-attente");
  if (href === "/sante/hopitaux") return pathname.startsWith("/sante/hopitaux");
  if (href === "/sante/rapports") return pathname.startsWith("/sante/rapports");
  if (href === "/charroi/vehicules") return pathname === "/charroi/vehicules";
  if (href === "/charroi/rapports") return pathname.startsWith("/charroi/rapports");
  if (href === "/charroi") return pathname === "/charroi";
  if (href === "/paie") return pathname === "/paie";
  if (href === "/paie/bulletins") return pathname.startsWith("/paie/bulletins");
  if (href === "/paie/exploitation") return pathname.startsWith("/paie/exploitation");
  if (href === "/conges/dashboard") return pathname === "/conges/dashboard";
  if (href === "/pointage/dashboard") return pathname === "/pointage/dashboard";
  if (href === "/pointage/saisie") return pathname.startsWith("/pointage/saisie");
  if (href === "/pointage/gestion") return pathname.startsWith("/pointage/gestion");
  if (href === "/pointage/rapports") return pathname.startsWith("/pointage/rapports");
  if (href === "/formations/dashboard") return pathname === "/formations/dashboard";
  if (href === "/formations/nouvelle") return pathname === "/formations/nouvelle";
  if (href === "/formations/gestion") return pathname.startsWith("/formations/gestion");
  if (href === "/utilisateurs/compte") return pathname === "/utilisateurs/compte";
  if (href === "/utilisateurs/permissions") return pathname.startsWith("/utilisateurs/permissions");
  if (href === "/utilisateurs/logs") return pathname.startsWith("/utilisateurs/logs");
  if (href === "/parametres") return pathname.startsWith("/parametres");
  if (href.startsWith("/import")) return pathname.startsWith("/import");
  return pathname === href || pathname.startsWith(href + "/");
}

function childIsActive(pathname: string, child: NavChild) {
  if (!isNavLink(child)) return false;
  return isActive(pathname, child.href);
}

function groupHasActiveChild(pathname: string, group: NavGroup) {
  return group.children?.some((c) => childIsActive(pathname, c)) ?? false;
}

function groupActive(pathname: string, group: NavGroup) {
  if (group.children?.length) return false;
  if (group.href) return isActive(pathname, group.href);
  return false;
}

function groupDefaultHref(group: NavGroup): string {
  if (group.href) return group.href;
  const firstLink = group.children?.find(isNavLink);
  return firstLink?.href ?? "/";
}

function filterNavGroup(
  group: NavGroup,
  canHref: (href: string) => boolean,
  canModule?: (moduleId: string) => boolean
): NavGroup | null {
  if (group.children?.length) {
    const children = group.children.filter((child) =>
      isNavLink(child) ? canHref(child.href) : true
    );
    if (children.length === 0) return null;
    if (canModule && group.id !== "utilisateurs" && !canModule(group.id)) return null;
    return { ...group, children };
  }
  if (group.href && !canHref(group.href)) return null;
  return group;
}

function childKey(child: NavChild) {
  return isNavLink(child) ? child.href : child.action;
}

export function Sidebar() {
  const pathname = usePathname();
  const { canHref, canModule } = useAuth();
  const { sidebarCollapsed, toggleSidebar, openProfileModal } = useLayout();
  const [open, setOpen] = useState<Record<string, boolean>>({
    employes: true,
    sante: pathname.startsWith("/sante"),
    charroi: pathname.startsWith("/charroi"),
    postes: pathname.startsWith("/postes"),
    paie: pathname.startsWith("/paie"),
    pointage: pathname.startsWith("/pointage"),
    utilisateurs: pathname.startsWith("/utilisateurs"),
  });
  const [hoverGroup, setHoverGroup] = useState<string | null>(null);

  useEffect(() => {
    if (sidebarCollapsed) {
      setOpen({});
    }
  }, [sidebarCollapsed]);

  const toggle = (id: string) =>
    setOpen((o) => ({ ...o, [id]: !o[id] }));

  const visibleNavigation = navigation
    .map((group) => filterNavGroup(group, canHref, canModule))
    .filter((group): group is NavGroup => group !== null);
  const visibleBottomNavigation = bottomNavigation
    .map((group) => filterNavGroup(group, canHref, canModule))
    .filter((group): group is NavGroup => group !== null);

  const linkClass = (active: boolean) =>
    cn(
      "shell-nav-link flex items-center rounded-xl text-sm font-medium transition",
      sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
      active
        ? "shell-nav-link--active"
        : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
    );

  const childLinkClass = (childActive: boolean, isSub: boolean, inFlyout = false) =>
    cn(
      "shell-nav-link flex w-full items-center gap-2 rounded-lg text-sm transition",
      inFlyout
        ? "mx-2 px-3 py-2"
        : cn("py-2", isSub ? "shell-nav-link--child pl-1 text-xs" : "px-2"),
      childActive
        ? "shell-nav-link--active"
        : "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
    );

  function renderNavChild(child: NavChild, inFlyout = false) {
    const isSub = child.label.startsWith("↳");
    const ChildIcon = child.icon;

    if (!isNavLink(child)) {
      return (
        <button
          key={childKey(child)}
          type="button"
          onClick={openProfileModal}
          className={childLinkClass(false, isSub, inFlyout)}
        >
          {ChildIcon && (
            <ChildIcon className="shell-nav-icon icon-hover-scale h-3.5 w-3.5 shrink-0" />
          )}
          {child.label}
        </button>
      );
    }

    const childActive = isActive(pathname, child.href);
    const ResolvedIcon =
      ChildIcon ??
      (child.href.includes("checklist")
        ? FileCheck
        : child.href.includes("cnss") && !isSub
          ? Shield
          : null);

    return (
      <Link
        key={childKey(child)}
        href={child.href}
        className={childLinkClass(childActive, isSub, inFlyout)}
      >
        {ResolvedIcon && (
          <ResolvedIcon className="shell-nav-icon icon-hover-scale h-3.5 w-3.5 shrink-0" />
        )}
        {child.label.replace(/^↳\s*/, "")}
      </Link>
    );
  }

  function renderNavGroup(group: NavGroup) {
    const Icon = group.icon;
    const hasChildren = !!group.children?.length;
    const hasActiveChild = groupHasActiveChild(pathname, group);
    const active = groupActive(pathname, group);
    const expanded = !sidebarCollapsed && (open[group.id] ?? hasActiveChild);

    if (!hasChildren && group.href) {
      return (
        <Link
          key={group.id}
          href={group.href}
          title={sidebarCollapsed ? group.label : undefined}
          className={linkClass(active)}
        >
          <Icon className="shell-nav-icon icon-hover-scale h-4 w-4 shrink-0" />
          {!sidebarCollapsed && group.label}
        </Link>
      );
    }

    if (sidebarCollapsed) {
      return (
        <div
          key={group.id}
          className="relative"
          onMouseEnter={() => setHoverGroup(group.id)}
          onMouseLeave={() => setHoverGroup(null)}
        >
          <Link
            href={groupDefaultHref(group)}
            title={group.label}
            className={linkClass(hasChildren ? false : active)}
          >
            <Icon className="shell-nav-icon icon-hover-scale h-4 w-4 shrink-0" />
          </Link>
          {hoverGroup === group.id && group.children && (
            <div className="absolute left-full top-0 z-50 ml-2 min-w-[12rem] rounded-xl border border-[var(--shell-border)] bg-[var(--shell-sidebar)] py-2 shadow-xl">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--shell-text-muted)]">
                {group.label}
              </p>
              {group.children.map((child) => renderNavChild(child, true))}
              {group.id === "utilisateurs" && (
                <div className="mx-2 mt-1 border-t border-[var(--shell-border)] pt-2">
                  <ThemeModeToggle />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={group.id}>
        <button
          type="button"
          onClick={() => toggle(group.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            "text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]",
            hasActiveChild && "text-[var(--shell-text)]"
          )}
        >
          <Icon className="shell-nav-icon icon-hover-scale h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={cn("icon-hover-scale h-4 w-4 transition", expanded && "rotate-180")}
          />
        </button>
        {expanded && group.children && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-[var(--shell-border)] pl-3">
            {group.children.map((child) => renderNavChild(child))}
            {group.id === "utilisateurs" && (
              <div className="pt-1">
                <ThemeModeToggle />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "shell-sidebar fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--shell-border)] bg-[var(--shell-sidebar)] backdrop-blur-xl transition-[width] duration-200",
        sidebarCollapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-[var(--shell-border)]",
          sidebarCollapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-5"
        )}
      >
        <div className={cn("flex items-center", sidebarCollapsed ? "" : "gap-3 min-w-0")}>
          <div className="icon-hover-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-lg font-bold text-white">
            RH
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-[var(--shell-text)]">SIRH RDC</h1>
              <p className="text-[10px] text-[var(--shell-text-muted)]">Loi 015/2002</p>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Réduire le menu"
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
          >
            <PanelLeftClose className="icon-hover-scale h-4 w-4" />
          </button>
        )}
      </div>

      {sidebarCollapsed && (
        <div className="flex justify-center border-b border-[var(--shell-border)] py-2">
          <button
            type="button"
            onClick={toggleSidebar}
            title="Déplier le menu"
            className="rounded-lg p-2 text-[var(--shell-text-muted)] hover:bg-[var(--shell-hover)] hover:text-[var(--shell-text)]"
          >
            <PanelLeftOpen className="icon-hover-scale h-4 w-4" />
          </button>
        </div>
      )}

      <nav className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {visibleNavigation.map(renderNavGroup)}
        </div>
        <div className="shrink-0 space-y-1 border-t border-[var(--shell-border)] px-2 py-3">
          {visibleBottomNavigation.map(renderNavGroup)}
          {sidebarCollapsed && (
            <ThemeModeToggle collapsed />
          )}
        </div>
      </nav>
    </aside>
  );
}
