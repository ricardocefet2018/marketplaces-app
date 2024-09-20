import { api } from "./preload";

improt api

export {};

declare global {
  interface Window {
    api: typeof api;
  }
}
