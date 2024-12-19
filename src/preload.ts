import { contextBridge } from "electron";
import { api } from "./preloads/api";
import { events } from "./preloads/events";

contextBridge.exposeInMainWorld("api", api);
contextBridge.exposeInMainWorld("events", events);

type ApiType = typeof api;
type EventsType = typeof events;

export type { ApiType, EventsType };
