// myToast.ts
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
  };
  return myToast;
}
