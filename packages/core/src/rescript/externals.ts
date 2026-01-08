import fs from "node:fs";
import path from "node:path";
import type { ExternalAttributes, ExternalDecl } from "../types.js";

export function collectExternalDecls(
  sourceDirs: string[],
): ExternalDecl[] {
  const fileMap = new Map<string, { path: string; ext: string }>();

  for (const dir of sourceDirs) {
    for (const file of listResFiles(dir)) {
      const ext = path.extname(file);
      const moduleKey = file.slice(0, -ext.length);
      const existing = fileMap.get(moduleKey);
      if (!existing || ext === ".resi") {
        fileMap.set(moduleKey, { path: file, ext });
      }
    }
  }

  const externals: ExternalDecl[] = [];
  for (const entry of fileMap.values()) {
    externals.push(...parseExternalsFromFile(entry.path));
  }
  return externals;
}

function listResFiles(rootDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(rootDir)) {
    return results;
  }
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listResFiles(full));
      continue;
    }
    if (full.endsWith(".res") || full.endsWith(".resi")) {
      results.push(full);
    }
  }
  return results;
}

function parseExternalsFromFile(filePath: string): ExternalDecl[] {
  const source = fs.readFileSync(filePath, "utf8");
  return scanExternals(source, filePath);
}

function scanExternals(source: string, filePath: string): ExternalDecl[] {
  const externals: ExternalDecl[] = [];
  const pendingAttrs: ExternalAttributes = {};
  let i = 0;

  const resetAttrs = () => {
    for (const key of Object.keys(pendingAttrs) as (keyof ExternalAttributes)[]) {
      delete pendingAttrs[key];
    }
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === "/" && source[i + 1] === "/") {
      i = skipLineComment(source, i);
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i = skipBlockComment(source, i);
      continue;
    }
    if (ch && isWhitespace(ch)) {
      i += 1;
      continue;
    }

    if (ch === "@") {
      const attr = readAttribute(source, i);
      if (attr) {
        applyAttribute(pendingAttrs, attr.name, attr.args);
        i = attr.end;
        continue;
      }
    }

    if (isWordAt(source, i, "external")) {
      const start = i;
      i += "external".length;
      i = skipWhitespace(source, i);
      const name = readIdentifier(source, i);
      if (!name) {
        resetAttrs();
        continue;
      }
      i = name.end;
      i = skipWhitespace(source, i);
      if (source[i] !== ":") {
        resetAttrs();
        continue;
      }
      i += 1;
      const typeResult = readType(source, i);
      if (!typeResult) {
        resetAttrs();
        continue;
      }
      i = typeResult.end;
      i = skipWhitespace(source, i);
      if (source[i] !== "=") {
        resetAttrs();
        continue;
      }
      i += 1;
      i = skipWhitespace(source, i);
      const binding = readBinding(source, i);
      if (!binding) {
        resetAttrs();
        continue;
      }
      i = binding.end;

      const loc = indexToLineCol(source, start);
      externals.push({
        name: name.value,
        binding: binding.value,
        resType: typeResult.value.trim(),
        attributes: { ...pendingAttrs },
        file: filePath,
        line: loc.line,
        column: loc.column,
      });
      resetAttrs();
      continue;
    }

    resetAttrs();
    i += 1;
  }

  return externals;
}

function isWhitespace(ch: string): boolean {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
}

function skipWhitespace(source: string, start: number): number {
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    if (!ch || !isWhitespace(ch)) {
      break;
    }
    i += 1;
  }
  return i;
}

function skipLineComment(source: string, start: number): number {
  let i = start + 2;
  while (i < source.length && source[i] !== "\n") {
    i += 1;
  }
  return i;
}

function skipBlockComment(source: string, start: number): number {
  let i = start + 2;
  while (i < source.length) {
    if (source[i] === "*" && source[i + 1] === "/") {
      return i + 2;
    }
    i += 1;
  }
  return i;
}

function isWordAt(source: string, index: number, word: string): boolean {
  if (source.slice(index, index + word.length) !== word) {
    return false;
  }
  const before = source[index - 1];
  const after = source[index + word.length];
  if (before && /[A-Za-z0-9_']/.test(before)) {
    return false;
  }
  if (after && /[A-Za-z0-9_']/.test(after)) {
    return false;
  }
  return true;
}

function readIdentifier(source: string, start: number) {
  let i = start;
  let value = "";
  while (i < source.length) {
    const ch = source[i];
    if (!ch || !/[A-Za-z0-9_']/.test(ch)) {
      break;
    }
    value += ch;
    i += 1;
  }
  if (!value) {
    return null;
  }
  return { value, end: i };
}

function readAttribute(source: string, start: number) {
  let i = start;
  if (source[i] !== "@") {
    return null;
  }
  i += 1;
  const name = readIdentifier(source, i);
  if (!name) {
    return null;
  }
  i = name.end;
  i = skipWhitespace(source, i);
  let args: string[] | undefined;
  if (source[i] === "(") {
    const content = readBalanced(source, i, "(", ")");
    if (!content) {
      return null;
    }
    i = content.end;
    args = splitArgs(content.value.slice(1, -1));
  }
  return { name: name.value, args, end: i };
}

function applyAttribute(
  attrs: ExternalAttributes,
  name: string,
  args?: string[],
) {
  if (name === "module" && args && args[0]) {
    attrs.module = unquote(args[0]);
    return;
  }
  if (name === "scope" && args) {
    attrs.scope = args.map(unquote);
    return;
  }
  if (name === "val") {
    attrs.val = true;
    return;
  }
  if (name === "send") {
    attrs.send = true;
    return;
  }
  if (name === "new") {
    attrs.new = true;
    return;
  }
  if (name === "get") {
    attrs.get = true;
    return;
  }
  if (name === "set") {
    attrs.set = true;
    return;
  }
  if (name === "as" && args && args[0]) {
    attrs.as = unquote(args[0]);
  }
}

function readBalanced(
  source: string,
  start: number,
  open: string,
  close: string,
) {
  if (source[start] !== open) {
    return null;
  }
  let i = start;
  let depth = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\"" || ch === "'") {
      i = skipString(source, i);
      continue;
    }
    if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return { value: source.slice(start, i + 1), end: i + 1 };
      }
    }
    i += 1;
  }
  return null;
}

function splitArgs(content: string): string[] {
  const parts: string[] = [];
  let current = "";
  let i = 0;
  let depth = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "\"" || ch === "'") {
      const end = skipString(content, i);
      current += content.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{" || ch === "<") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}" || ch === ">") {
      depth -= 1;
    } else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  if (current.trim()) {
    parts.push(current.trim());
  }
  return parts;
}

function readType(source: string, start: number) {
  let i = start;
  let depthParen = 0;
  let depthAngle = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let value = "";

  while (i < source.length) {
    const ch = source[i];
    if (ch === "\"" || ch === "'") {
      const end = skipString(source, i);
      value += source.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "(") depthParen += 1;
    if (ch === ")") depthParen -= 1;
    if (ch === "<") depthAngle += 1;
    if (ch === ">") depthAngle -= 1;
    if (ch === "{") depthBrace += 1;
    if (ch === "}") depthBrace -= 1;
    if (ch === "[") depthBracket += 1;
    if (ch === "]") depthBracket -= 1;
    if (
      ch === "=" &&
      depthParen === 0 &&
      depthAngle === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
      return { value: value.trim(), end: i };
    }
    value += ch;
    i += 1;
  }
  return null;
}

function readBinding(source: string, start: number) {
  let i = start;
  if (source[i] === "\"" || source[i] === "'") {
    const end = skipString(source, i);
    const raw = source.slice(i, end);
    return { value: unquote(raw), end };
  }
  const ident = readIdentifier(source, i);
  if (ident) {
    return { value: ident.value, end: ident.end };
  }
  return null;
}

function skipString(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  return i;
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function indexToLineCol(source: string, index: number) {
  let line = 1;
  let column = 1;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}
