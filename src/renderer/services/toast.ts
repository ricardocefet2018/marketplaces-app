import { useToast } from "primevue/usetoast";

export function useMyToast() {
  const pvToast = useToast();

  const myToast = {
    success: (msg: string) => {
      pvToast.add({
        severity: "success",
        summary: "Success",
        detail: msg,
        life: 3000,
      });
    },
    error: (msg: string) => {
      pvToast.add({
        severity: "error",
        summary: "Error",
        detail: msg,
        life: 6000,
      });
    },
    warn: (msg: string) => {
      pvToast.add({
        severity: "warn",
        summary: "Warn",
        detail: msg,
        life: 3000,
      });
    },
    info: (msg: string) => {
      pvToast.add({
        severity: "info",
        summary: "Info",
        detail: msg,
        life: 3000,
      });
    },
    clear: () => {
      pvToast.removeAllGroups();
    },
  };
  return myToast;
}
