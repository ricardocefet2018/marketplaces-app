import { appDataDirectory } from "@doctormckay/stdlib/os";
import { EventEmitter } from "events";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

/**
 * returns null if filePath don't exist
 */
export async function getJsonContent<T>(filePath: string): Promise<T | null> {
  if (path.extname(filePath) !== ".json")
    throw new Error("Only JSONs are supported!");

  try {
    const fileContentString = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(fileContentString, reviver) as T;
  } catch (err: any) {
    if (err.code == "ENOENT") return null;
    throw err;
  }
}

/**
 * returns an empty string case filePath don't exist
 */
export async function getFileContent(filePath: string): Promise<string> {
  try {
    const fileContentString = await fsp.readFile(filePath, "utf-8");
    return fileContentString;
  } catch (err: any) {
    if (err.code == "ENOENT") return "";
    throw err;
  }
}

/**
 * @param content supports Map & Set inside content
 */
export async function setJSONContent(
  filePath: string,
  content: object
): Promise<void> {
  ensureDirectoryExistence(filePath);

  const tempFile = filePath + ".tmp";
  const contentString = JSON.stringify(content, replacer);
  await fsp.writeFile(tempFile, contentString, "utf-8");
  await fsp.rename(tempFile, filePath);
  return;
}

export async function setFileContent(
  filePath: string,
  content: string
): Promise<void> {
  ensureDirectoryExistence(filePath);
  const tempFile = filePath + ".tmp";
  await fsp.writeFile(tempFile, content, "utf-8");
  await fsp.rename(tempFile, filePath);
  return;
}

function replacer(key: string, value: any) {
  if (value instanceof Map)
    return {
      _type: "Map",
      _value: Array.from(value),
    };
  if (value instanceof Set)
    return {
      _type: "Set",
      _value: Array.from(value),
    };
  return value;
}

function reviver(key: string, value: any) {
  if (value._type == "Map") return new Map(value._value);
  if (value._type == "Set") return new Set(value._value);
  return value;
}

export function daysToMS(d: number) {
  return hoursToMS(d * 24);
}

export function hoursToMS(h: number) {
  return minutesToMS(h * 60);
}

export function minutesToMS(m: number) {
  return secondsToMS(m * 60);
}

export function secondsToMS(s: number) {
  return s * 1e3;
}

export function getPromiseFromEvent(item: EventEmitter, event: string) {
  return new Promise<void>((resolve) => {
    const listener = () => {
      item.removeListener(event, listener);
      resolve();
    };
    item.on(event, listener);
  });
}

export async function handleError(err: any, storagePath = getAppStoragePath()) {
  let stringToSave = `\n[${new Date().toISOString()}] `;
  if (!(err instanceof Error)) stringToSave += JSON.stringify(err);
  else stringToSave += `${err.name}\n${err.message}\n${err.stack}`;
  console.error(stringToSave.trim());
  const errorsLogPath = path.join(storagePath, "logs", "logErrors.txt");
  ensureDirectoryExistence(errorsLogPath);
  let content = await getFileContent(errorsLogPath);
  content += stringToSave;
  await setFileContent(errorsLogPath, content);
}

export async function infoLogger(
  info: string,
  storagePath = getAppStoragePath()
) {
  if (!storagePath) storagePath = getAppStoragePath();
  const stringToSave = `[${new Date().toISOString()}] ${info}`;
  console.log(stringToSave.trim());
  const infosLogPath = path.join(storagePath, "logs", "logInfos.txt");
  ensureDirectoryExistence(infosLogPath);
  let content = await getFileContent(infosLogPath);
  content += "\n" + stringToSave;
  await setFileContent(infosLogPath, content);
}

export function getAppStoragePath() {
  return appDataDirectory({
    appAuthor: "ricardorocha_os",
    appName: "multimarketplaces-app",
  });
}

export async function getDBPath() {
  const dbPath = path.join(getAppStoragePath(), "db.sqlite");
  ensureDirectoryExistence(dbPath);
  return dbPath;
}
