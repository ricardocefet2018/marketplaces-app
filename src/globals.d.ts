import { IpcMainInvokeEvent } from "electron";
import { ApiType, EventsType } from "./preload";

export {};

declare global {
  interface Window {
    api: ApiType;
    events: EventsType;
  }

  type EventSender = <U extends keyof EventsType>(
    channel: U,
    ...args: Parameters<Parameters<EventsType[U]>[0]>
  ) => void;

  type apiHandler = <U extends keyof ApiType>(
    channel: U,
    linstenner: (
      e: IpcMainInvokeEvent,
      ...args: Parameters<ApiType[U]>
    ) => ReturnType<ApiType[U]>
  ) => void;
}
