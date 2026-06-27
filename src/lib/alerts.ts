"use client";

import Swal from "sweetalert2";

const swalBase = {
  confirmButtonText: "OK",
  confirmButtonColor: "#0284c7",
  background: "#0f172a",
  color: "#f8fafc",
};

export async function showErrorAlert(title: string, message?: string) {
  await Swal.fire({
    ...swalBase,
    icon: "error",
    title,
    text: message,
  });
}

export async function showSuccessAlert(title: string, message?: string) {
  await Swal.fire({
    ...swalBase,
    icon: "success",
    title,
    text: message,
  });
}

export async function showWarningAlert(title: string, message?: string) {
  await Swal.fire({
    ...swalBase,
    icon: "warning",
    title,
    text: message,
  });
}

/** Dialogue de confirmation (retourne true si l'utilisateur confirme). */
export async function showConfirmAlert(options: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const result = await Swal.fire({
    ...swalBase,
    icon: options.danger ? "warning" : "question",
    title: options.title,
    text: options.message,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Confirmer",
    cancelButtonText: options.cancelText ?? "Annuler",
    confirmButtonColor: options.danger ? "#dc2626" : swalBase.confirmButtonColor,
    cancelButtonColor: "#475569",
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}

/** Indicateur de chargement bloquant (fermer avec `closeLoadingAlert`). */
export function showLoadingAlert(title: string, message?: string) {
  void Swal.fire({
    ...swalBase,
    title,
    text: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeLoadingAlert() {
  Swal.close();
}

export async function runWithLoadingAlert<T>(
  fn: () => Promise<T>,
  title: string,
  message?: string
): Promise<T> {
  showLoadingAlert(title, message);
  try {
    return await fn();
  } finally {
    closeLoadingAlert();
  }
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    /* corps non JSON */
  }
  return `Erreur serveur (${res.status})`;
}

/** Confirmation + progression dans le même SweetAlert (suppression, etc.). */
export async function runDeleteWithSweetAlert(
  options: {
    title: string;
    message?: string;
    progressTitle?: string;
    progressMessage?: string;
    successTitle?: string;
    successMessage?: string;
  },
  action: () => Promise<Response>
): Promise<boolean> {
  const result = await Swal.fire({
    ...swalBase,
    icon: "warning",
    title: options.title,
    text: options.message,
    showCancelButton: true,
    confirmButtonText: "Supprimer",
    cancelButtonText: "Annuler",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#475569",
    reverseButtons: true,
    focusCancel: true,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async () => {
      Swal.update({
        title: options.progressTitle ?? "Suppression en cours…",
        text: options.progressMessage,
        icon: undefined,
      });
      const res = await action();
      if (!res.ok) {
        Swal.showValidationMessage(await readApiError(res));
        return false;
      }
      return true;
    },
  });

  if (!result.isConfirmed) return false;

  await Swal.fire({
    ...swalBase,
    icon: "success",
    title: options.successTitle ?? "Suppression réussie",
    text: options.successMessage,
  });
  return true;
}
