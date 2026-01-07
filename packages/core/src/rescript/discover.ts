import fs from "node:fs";
import path from "node:path";

export interface RescriptConfig {
  rootDir: string;
  rescriptJsonPath: string;
  sourceDirs: string[];
}

export function findRescriptConfig(startDir: string): RescriptConfig | null {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, "rescript.json");
    if (fs.existsSync(candidate)) {
      const sourceDirs = readSourceDirs(candidate, current);
      return {
        rootDir: current,
        rescriptJsonPath: candidate,
        sourceDirs,
      };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function readSourceDirs(rescriptJsonPath: string, rootDir: string): string[] {
  const raw = fs.readFileSync(rescriptJsonPath, "utf8");
  const json = JSON.parse(raw) as { sources?: unknown };
  const sources = json.sources ?? [];
  const dirs: string[] = [];

  if (Array.isArray(sources)) {
    for (const entry of sources) {
      if (typeof entry === "string") {
        dirs.push(path.join(rootDir, entry));
        continue;
      }
      if (entry && typeof entry === "object") {
        const dir = (entry as { dir?: string }).dir;
        if (typeof dir === "string") {
          const fullDir = path.join(rootDir, dir);
          dirs.push(fullDir);
          const subdirs = (entry as { subdirs?: unknown }).subdirs;
          if (subdirs === true || subdirs === "recurse") {
            dirs.push(...listSubdirs(fullDir));
          }
        }
      }
    }
  }

  return Array.from(new Set(dirs));
}

function listSubdirs(rootDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(rootDir)) {
    return results;
  }
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(rootDir, entry.name);
    results.push(full, ...listSubdirs(full));
  }
  return results;
}
