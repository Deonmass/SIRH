import {
  hashPassword,
  hashPasswordLegacySha256,
  verifyPasswordWithLegacy,
} from "@/lib/auth/password";
import { fullPermissionMatrix } from "@/lib/permissions";
import type { DbUtilisateurRow } from "../../../database/migrations/023_utilisateurs.types";
import {
  createUtilisateurInDb,
  deleteUtilisateurInDb,
  getUtilisateurByIdFromDb,
  getUtilisateurByUsernameFromDb,
  getUtilisateurRowById,
  listUtilisateursFromDb,
  updateUtilisateurInDb,
} from "@/lib/repositories/utilisateurs";
import { rowToUtilisateur } from "@/lib/repositories/utilisateurs/mapper";
import { logMutation, snapshot } from "@/lib/activity-log-mutation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { PermissionMatrix } from "@/lib/permissions";
import type { Utilisateur, UtilisateurRecord } from "@/lib/types";

function usesSupabaseDb(): boolean {
  return isSupabaseConfigured();
}

/** Store accessors injected to avoid circular imports — set by store.ts */
let localStore: {
  listLocal: () => Promise<UtilisateurRecord[]>;
  getByUsername: (username: string) => Promise<UtilisateurRecord | null>;
  getById: (id: string) => Promise<UtilisateurRecord | null>;
  create: (
    input: {
      username: string;
      passeword: string;
      matriculAgent?: string | null;
      permissions?: PermissionMatrix;
      actif?: boolean;
    },
    audit?: { createdBy?: string }
  ) => Promise<Utilisateur>;
  update: (
    id: string,
    input: {
      username?: string;
      passeword?: string;
      matriculAgent?: string | null;
      permissions?: PermissionMatrix;
      actif?: boolean;
    },
    audit?: { updatedBy?: string }
  ) => Promise<Utilisateur>;
  remove: (id: string) => Promise<void>;
} | null = null;

export function registerUtilisateurLocalStore(store: NonNullable<typeof localStore>) {
  localStore = store;
}

export async function listUtilisateurs(): Promise<Utilisateur[]> {
  if (usesSupabaseDb()) return listUtilisateursFromDb();
  if (!localStore) return [];
  return localStore.listLocal();
}

export async function getUtilisateur(id: string): Promise<Utilisateur | null> {
  if (usesSupabaseDb()) return getUtilisateurByIdFromDb(id);
  if (!localStore) return null;
  const row = await localStore.getById(id);
  return row ? stripPassword(row) : null;
}

export async function getUtilisateurRecord(id: string): Promise<UtilisateurRecord | null> {
  if (usesSupabaseDb()) {
    const row = await getUtilisateurRowById(id);
    if (!row) return null;
    return utilisateurRecordFromDbRow(row);
  }
  if (!localStore) return null;
  return localStore.getById(id);
}

function utilisateurRecordFromDbRow(row: DbUtilisateurRow): UtilisateurRecord {
  return { ...rowToUtilisateur(row), passeword: row.passeword };
}

export type AuthenticateResult =
  | { ok: true; user: Utilisateur }
  | { ok: false; reason: "invalid" | "disabled" };

export async function authenticateUserDetailed(
  username: string,
  password: string
): Promise<AuthenticateResult> {
  if (usesSupabaseDb()) {
    const row = await getUtilisateurByUsernameFromDb(username);
    if (!row || !verifyPasswordWithLegacy(password, row.passeword)) {
      return { ok: false, reason: "invalid" };
    }
    if (row.actif === false) return { ok: false, reason: "disabled" };
    const { passeword: _p, ...user } = row;
    return { ok: true, user };
  }
  if (!localStore) return { ok: false, reason: "invalid" };
  const row = await localStore.getByUsername(username);
  if (!row || !verifyPasswordWithLegacy(password, row.passeword)) {
    return { ok: false, reason: "invalid" };
  }
  if (row.actif === false) return { ok: false, reason: "disabled" };
  return { ok: true, user: stripPassword(row) };
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<Utilisateur | null> {
  const result = await authenticateUserDetailed(username, password);
  return result.ok ? result.user : null;
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await getUtilisateurRecord(userId);
  if (!record) return { ok: false, error: "Compte introuvable" };
  if (!verifyPasswordWithLegacy(currentPassword, record.passeword)) {
    return { ok: false, error: "Mot de passe actuel incorrect" };
  }
  if (newPassword.length < 3) {
    return { ok: false, error: "Le nouveau mot de passe doit contenir au moins 3 caractères" };
  }
  await updateUtilisateur(userId, { password: newPassword }, { updatedBy: record.username });
  return { ok: true };
}

export async function createUtilisateur(
  input: {
    username: string;
    password: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  },
  audit?: { createdBy?: string }
): Promise<Utilisateur> {
  const passeword = hashPassword(input.password);
  const created = usesSupabaseDb()
    ? await createUtilisateurInDb(
        {
          username: input.username,
          passeword,
          matriculAgent: input.matriculAgent,
          permissions: input.permissions,
          actif: input.actif,
        },
        audit
      )
    : await (async () => {
        if (!localStore) throw new Error("Store local indisponible");
        return localStore.create(
          {
            username: input.username,
            passeword,
            matriculAgent: input.matriculAgent,
            permissions: input.permissions,
            actif: input.actif,
          },
          audit
        );
      })();

  await logMutation({
    action: "insertion",
    entityType: "utilisateur",
    entityId: created.id,
    entityLabel: created.username,
    summary: `Création utilisateur « ${created.username} »`,
    payloadAfter: snapshot(created),
    utilisateur: audit?.createdBy ?? undefined,
    createdBy: audit?.createdBy ?? undefined,
  });
  return created;
}

export async function updateUtilisateur(
  id: string,
  input: {
    username?: string;
    password?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  },
  audit?: { updatedBy?: string }
): Promise<Utilisateur> {
  const patch: {
    username?: string;
    passeword?: string;
    matriculAgent?: string | null;
    permissions?: PermissionMatrix;
    actif?: boolean;
  } = {
    username: input.username,
    matriculAgent: input.matriculAgent,
    permissions: input.permissions,
    actif: input.actif,
  };
  if (input.password) patch.passeword = hashPassword(input.password);

  const before = await getUtilisateur(id);
  const updated = usesSupabaseDb()
    ? await updateUtilisateurInDb(id, patch, audit)
    : await (async () => {
        if (!localStore) throw new Error("Store local indisponible");
        return localStore.update(id, patch, audit);
      })();

  const action =
    input.actif === false && before?.actif !== false
      ? "desactivation"
      : input.actif === true && before?.actif === false
        ? "activation"
        : "modification";

  await logMutation({
    action,
    entityType: "utilisateur",
    entityId: updated.id,
    entityLabel: updated.username,
    summary:
      action === "desactivation"
        ? `Désactivation utilisateur « ${updated.username} »`
        : action === "activation"
          ? `Activation utilisateur « ${updated.username} »`
          : `Modification utilisateur « ${updated.username} »`,
    payloadBefore: before ? snapshot(before) : null,
    payloadAfter: snapshot(updated),
    utilisateur: audit?.updatedBy ?? undefined,
    createdBy: audit?.updatedBy ?? undefined,
  });
  return updated;
}

export async function deleteUtilisateur(id: string): Promise<void> {
  const before = await getUtilisateurRecord(id);
  if (usesSupabaseDb()) {
    await deleteUtilisateurInDb(id);
  } else {
    if (!localStore) throw new Error("Store local indisponible");
    await localStore.remove(id);
  }
  if (before) {
    await logMutation({
      action: "suppression",
      entityType: "utilisateur",
      entityId: before.id,
      entityLabel: before.username,
      summary: `Suppression utilisateur « ${before.username} »`,
      payloadBefore: snapshot(before),
      payloadAfter: null,
    });
  }
}

/** Restaure un compte supprimé en conservant le hash du mot de passe. */
export async function restoreUtilisateur(
  record: UtilisateurRecord,
  audit?: { createdBy?: string }
): Promise<Utilisateur> {
  if (usesSupabaseDb()) {
    return createUtilisateurInDb(
      {
        username: record.username,
        passeword: record.passeword,
        matriculAgent: record.matriculAgent,
        permissions: record.permissions,
        actif: record.actif,
      },
      audit
    );
  }
  if (!localStore) throw new Error("Store local indisponible");
  return localStore.create(
    {
      username: record.username,
      passeword: record.passeword,
      matriculAgent: record.matriculAgent,
      permissions: record.permissions,
      actif: record.actif,
    },
    audit
  );
}

export function defaultAdminSeed(): UtilisateurRecord {
  const now = new Date().toISOString();
  return {
    id: "1",
    username: "Admin",
    passeword: hashPasswordLegacySha256("123"),
    matriculAgent: null,
    permissions: fullPermissionMatrix(),
    actif: true,
    createdAt: now,
    createdBy: "system",
    updatedAt: now,
    updatedBy: "system",
  };
}

function stripPassword(row: UtilisateurRecord): Utilisateur {
  const { passeword: _p, ...user } = row;
  return user;
}
