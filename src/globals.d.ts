import apiType from "./preload";

export {};

declare global {
  interface Window {
    api: apiType;
  }
}
