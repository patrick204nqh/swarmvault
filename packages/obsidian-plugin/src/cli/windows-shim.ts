import { platform } from "node:os";
import { extname } from "node:path";

export function isWindows(): boolean {
  return platform() === "win32";
}

export function withCmdSuffix(binary: string): string {
  if (!isWindows()) return binary;
  if (extname(binary).length > 0) return binary;
  return `${binary}.cmd`;
}

export function isEnoent(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "ENOENT";
}
