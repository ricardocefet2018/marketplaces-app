import { EventEmitter } from "events";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { app } from "electron";

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

/**
 *  Checks if the filePath contains an Array and the type of the first and last element
 *  @param {T} element
 *  @throws Error on failing type checkings or read/write errors
 */
export async function pushElementToJsonFile<T>(
  filePath: string,
  element: T
): Promise<void> {
  let content: Array<T> = await getJsonContent(filePath);
  if (content === null) {
    content = [element];
    await setJSONContent(filePath, content);
    return;
  }
  if (!(content instanceof Array))
    throw new TypeError(`JSON content of ${filePath} is not an array.`);

  if (content.length === 0) {
    content.push(element);
    await setJSONContent(filePath, content);
    return;
  }

  if (typeof content[0] != typeof element)
    throw new Error(`JSON content is not same type of element.`);

  if (typeof content[0] === "object") {
    const contentType = Object.keys(content[0]);
    const elementType = Object.keys(element);
    const matches: boolean[] = [];
    contentType.forEach((ck) => matches.push(elementType.includes(ck)));
    elementType.forEach((ek) => matches.push(contentType.includes(ek)));
    const isSameType = matches.reduce((a, b) => a && b);
    if (!isSameType)
      throw new Error(`JSON content is not same type of element.`);
  }

  content.push(element);
  await setJSONContent(filePath, content);
  return;
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

export function daysToMS(d = 1) {
  return hoursToMS(d * 24);
}

export function hoursToMS(h = 1) {
  return minutesToMS(h * 60);
}

export function minutesToMS(m = 1) {
  return secondsToMS(m * 60);
}

export function secondsToMS(s = 1) {
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

export async function handleError(err: any, logsStoragePath?: string) {
  if (!logsStoragePath) logsStoragePath = app.getPath("logs");
  let stringToSave = `\n[${new Date().toISOString()}] `;
  if (!(err instanceof Error)) stringToSave += JSON.stringify(err);
  else stringToSave += `${err.name}\n${err.message}\n${err.stack}`;
  console.error(stringToSave.trim());
  const errorsLogPath = path.join(logsStoragePath, "logErrors.txt");
  ensureDirectoryExistence(errorsLogPath);
  let content = await getFileContent(errorsLogPath);
  content += stringToSave;
  await setFileContent(errorsLogPath, content);
}

export async function infoLogger(info: string, logsStoragePath?: string) {
  if (!logsStoragePath) logsStoragePath = app.getPath("logs");
  const stringToSave = `[${new Date().toISOString()}] ${info}`;
  console.log(stringToSave.trim());
  const infosLogPath = path.join(logsStoragePath, "logInfos.txt");
  ensureDirectoryExistence(infosLogPath);
  let content = await getFileContent(infosLogPath);
  content += "\n" + stringToSave;
  await setFileContent(infosLogPath, content);
}

export function getDBPath() {
  console.log(process.env);
  if (
    process.env["NODE_ENV"] === "development" ||
    !!process.env["npm_command"]
  ) {
    const dbPath = path.join(".", "db", "db.sqlite");
    ensureDirectoryExistence(dbPath);
    return dbPath;
  }
  // TODO change this process.env["APPDATA"] if willing to build to any plataform unless WINDOWS
  const dbPath = path.join(app.getPath("userData"), "db.sqlite");
  ensureDirectoryExistence(dbPath);
  return dbPath;
}

export async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input, output });

  console.log(question);
  const answer = await rl.question("");

  rl.close();

  return answer;
}
