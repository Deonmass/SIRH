"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, User, UserRound } from "lucide-react";
import { AddFamilyMemberModal } from "./AddFamilyMemberModal";
import { useContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { runWithLoadingAlert, showErrorAlert } from "@/lib/alerts";
import type { Employee, FamilyMember, Sexe } from "@/lib/types";
import { formatAgeFromBirth, cn } from "@/lib/utils";

const ROLE_LABELS: Record<FamilyMember["relation"], string> = {
  pere: "Père",
  mere: "Mère",
  conjoint: "Conjoint(e)",
  enfant: "Enfant",
  autre: "Autre",
};

function memberSexe(member: FamilyMember): Sexe {
  if (member.sexe) return member.sexe;
  if (member.relation === "pere") return "M";
  if (member.relation === "mere") return "F";
  return "M";
}

function partitionFamily(family: FamilyMember[]) {
  const conjoint = family.find((m) => m.relation === "conjoint");
  const children = family
    .filter((m) => m.relation === "enfant")
    .sort((a, b) => (a.dateNaissance || "9999").localeCompare(b.dateNaissance || "9999"));
  const autres = family.filter(
    (m) =>
      m.relation === "autre" || m.relation === "pere" || m.relation === "mere"
  );
  return { conjoint, children, autres };
}

function genderIcon(sexe: Sexe) {
  return sexe === "F" ? UserRound : User;
}

function iconToneClass(sexe: Sexe) {
  return sexe === "F" ? "family-org-node__icon--f" : "family-org-node__icon--m";
}

function agentRoleLabel(sexe: Sexe) {
  return sexe === "F" ? "Agente" : "Agent";
}

function conjointRoleLabel(member?: FamilyMember) {
  if (!member) return "Conjoint(e)";
  if (member.sexe === "F") return "Conjointe";
  if (member.sexe === "M") return "Conjoint";
  return "Conjoint(e)";
}

function MemberIdentityLines({
  prenom,
  nom,
  dateNaissance,
}: {
  prenom: string;
  nom: string;
  dateNaissance?: string;
}) {
  const ageLabel = dateNaissance ? formatAgeFromBirth(dateNaissance) : null;

  return (
    <>
      <p className="family-org-node__name">{prenom || "—"}</p>
      <p className="family-org-node__age">{nom || "—"}</p>
      {ageLabel && <p className="family-org-node__age">{ageLabel}</p>}
    </>
  );
}

function EmployeeNode({ employee }: { employee: Employee }) {
  const sexe = employee.sexe;
  const Icon = genderIcon(sexe);
  const nomLine = [employee.postNom, employee.nom].filter(Boolean).join(" ") || employee.nom;

  return (
    <div className="family-org-node family-org-node--employee">
      <div className={cn("family-org-node__icon", iconToneClass(sexe))}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="family-org-node__role">{agentRoleLabel(sexe)}</p>
      <MemberIdentityLines
        prenom={employee.prenom}
        nom={nomLine}
        dateNaissance={employee.dateNaissance}
      />
    </div>
  );
}

function FamilyNode({
  member,
  roleLabel,
  placeholder,
  editable,
  onEdit,
  onRemove,
  onAdd,
  onContextMenu,
}: {
  member?: FamilyMember;
  roleLabel: string;
  placeholder?: string;
  editable?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onAdd?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  if (!member) {
    return (
      <div
        className="family-org-node family-org-node--empty cursor-context-menu"
        onContextMenu={onContextMenu}
        onDoubleClick={onAdd}
      >
        <div className="family-org-node__icon family-org-node__icon--empty">
          <User className="h-6 w-6 opacity-30" />
        </div>
        <p className="family-org-node__role">{roleLabel}</p>
        <p className="family-org-node__name text-[var(--shell-text-muted)]">
          {placeholder ?? "Non renseigné"}
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 text-[10px] text-sky-500 hover:underline"
          >
            + Ajouter
          </button>
        )}
      </div>
    );
  }

  const sexe = memberSexe(member);
  const Icon = genderIcon(sexe);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={editable ? onEdit : undefined}
      onKeyDown={(e) => {
        if (editable && (e.key === "Enter" || e.key === " ")) onEdit?.();
      }}
      onContextMenu={onContextMenu}
      className={cn(
        "family-org-node group text-left",
        editable && "cursor-pointer"
      )}
    >
      <div className={cn("family-org-node__icon", iconToneClass(sexe))}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="family-org-node__role">{roleLabel}</p>
      <MemberIdentityLines
        prenom={member.prenom}
        nom={member.nom}
        dateNaissance={member.dateNaissance}
      />
      {editable && (
        <Pencil className="absolute right-1 bottom-1 h-3 w-3 text-[var(--shell-text-muted)] opacity-0 group-hover:opacity-100" />
      )}
    </div>
  );
}

export function FamilyOrganigram({
  employee,
  onFamilyChange,
}: {
  employee: Employee;
  onFamilyChange: (family: FamilyMember[]) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [initialRelation, setInitialRelation] = useState<FamilyMember["relation"]>("enfant");
  const [busy, setBusy] = useState(false);
  const { open, menuNode } = useContextMenu();

  const { conjoint, children, autres } = useMemo(
    () => partitionFamily(employee.family),
    [employee.family]
  );

  const showConjointSlot =
    employee.maritalStatus === "marie" ||
    employee.maritalStatus === "veuf" ||
    !!conjoint;

  async function handleSaveMember(member: FamilyMember): Promise<boolean> {
    setBusy(true);
    try {
      return await runWithLoadingAlert(async () => {
        const existing = employee.family.find((m) => m.id === member.id);
        const res = existing
          ? await fetch(
              `/api/employees/${encodeURIComponent(employee.id)}/famille/${encodeURIComponent(member.id)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(member),
              }
            )
          : await fetch(`/api/employees/${encodeURIComponent(employee.id)}/famille`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(member),
            });

        const data = (await res.json()) as { family?: FamilyMember[]; error?: string };
        if (!res.ok) {
          await showErrorAlert(
            "Enregistrement impossible",
            data.error ?? "Impossible d'enregistrer le membre de la famille."
          );
          return false;
        }
        if (!data.family) {
          await showErrorAlert(
            "Enregistrement impossible",
            "Réponse serveur incomplète."
          );
          return false;
        }
        onFamilyChange(data.family);
        return true;
      }, "Enregistrement…", "Mise à jour du membre de la famille.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(id: string) {
    setBusy(true);
    try {
      await runWithLoadingAlert(async () => {
        const res = await fetch(
          `/api/employees/${encodeURIComponent(employee.id)}/famille/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        const data = (await res.json()) as { family?: FamilyMember[]; error?: string };
        if (!res.ok || !data.family) {
          await showErrorAlert(
            "Suppression impossible",
            data.error ?? "Impossible de supprimer ce membre."
          );
          return;
        }
        onFamilyChange(data.family);
      }, "Suppression…", "Retrait du membre de la famille.");
    } finally {
      setBusy(false);
    }
  }

  function openAdd(relation: FamilyMember["relation"] = "enfant") {
    setEditing(null);
    setInitialRelation(relation);
    setModalOpen(true);
  }

  function openEdit(member: FamilyMember) {
    setEditing(member);
    setInitialRelation(member.relation);
    setModalOpen(true);
  }

  function memberMenu(
    e: React.MouseEvent,
    member: FamilyMember | undefined,
    relation: FamilyMember["relation"],
    roleLabel: string
  ) {
    const items: ContextMenuItem[] = [];
    if (member) {
      if (member.relation === "conjoint" || member.relation === "enfant" || member.relation === "pere" || member.relation === "mere") {
        items.push({
          id: "edit",
          label: "Modifier",
          icon: <Pencil className="h-3.5 w-3.5" />,
          onClick: () => openEdit(member),
        });
      }
      items.push({
        id: "remove",
        label: "Supprimer",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        danger: true,
        onClick: () => void removeMember(member.id),
      });
    } else {
      items.push({
        id: "add",
        label: `Ajouter ${roleLabel.toLowerCase()}`,
        icon: <Plus className="h-3.5 w-3.5" />,
        onClick: () => openAdd(relation),
      });
    }
    open(e, items);
  }

  return (
    <div className="family-org-panel relative" aria-busy={busy}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--shell-text)]">Famille</h3>
          <p className="text-xs text-[var(--shell-text-muted)]">
            Agent et conjoint(e) en tête · enfants en dessous · clic droit pour modifier
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => openAdd("enfant")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <div
        className={cn("family-org", busy && "pointer-events-none opacity-60")}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            open(e, [
              {
                id: "add-child",
                label: "Ajouter un enfant",
                icon: <Plus className="h-3.5 w-3.5" />,
                onClick: () => openAdd("enfant"),
              },
              {
                id: "add-spouse",
                label: "Ajouter conjoint(e)",
                icon: <Plus className="h-3.5 w-3.5" />,
                onClick: () => openAdd("conjoint"),
              },
            ]);
          }
        }}
      >
        <div
          className={cn(
            "family-org__couple",
            !showConjointSlot && "family-org__couple--solo"
          )}
        >
          <EmployeeNode employee={employee} />
          {showConjointSlot && (
            <FamilyNode
              member={conjoint}
              roleLabel={conjointRoleLabel(conjoint)}
              editable={!!conjoint}
              onEdit={conjoint ? () => openEdit(conjoint) : undefined}
              onAdd={() => openAdd("conjoint")}
              placeholder="Conjoint(e) non renseigné(e)"
              onContextMenu={(e) => memberMenu(e, conjoint, "conjoint", "Conjoint(e)")}
            />
          )}
        </div>

        <>
          <div className="family-org__stem" aria-hidden />
          <div className="family-org__children">
              {children.length === 0 ? (
                <p className="col-span-full text-center text-xs text-[var(--shell-text-muted)] py-2">
                  Aucun enfant — clic droit pour ajouter
                </p>
              ) : (
                children.map((child, i) => (
                  <div key={child.id} className="family-org__child-wrap">
                    <div className="family-org__child-connector" aria-hidden />
                    <FamilyNode
                      member={child}
                      roleLabel={`Enfant ${i + 1}`}
                      editable
                      onEdit={() => openEdit(child)}
                      onContextMenu={(e) => memberMenu(e, child, "enfant", "Enfant")}
                    />
                  </div>
                ))
              )}
            </div>
        </>

        {autres.length > 0 && (
          <div className="family-org__autres">
            <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--shell-text-muted)]">Autres</p>
            <div className="flex flex-wrap justify-center gap-3">
              {autres.map((m) => (
                <FamilyNode
                  key={m.id}
                  member={m}
                  roleLabel={ROLE_LABELS[m.relation]}
                  editable
                  onEdit={() => openEdit(m)}
                  onContextMenu={(e) => memberMenu(e, m, m.relation, ROLE_LABELS[m.relation])}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <AddFamilyMemberModal
          employee={employee}
          existing={editing}
          initialRelation={initialRelation}
          saving={busy}
          onSave={handleSaveMember}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}
      {menuNode}
    </div>
  );
}
