const builtinTypes: Record<string, string> = {
  int: "number",
  float: "number",
  string: "string",
  bool: "boolean",
  unit: "void",
  bigint: "bigint",
};

export interface TypeTransformResult {
  typeText: string;
  warnings: string[];
}

export function rescriptTypeToTs(typeText: string): TypeTransformResult {
  const warnings: string[] = [];
  const converted = parseType(typeText.trim(), warnings);
  return { typeText: converted, warnings };
}

function parseType(input: string, warnings: string[]): string {
  const trimmed = stripOuterParens(input.trim());
  const arrowIndex = findTopLevelArrow(trimmed);
  if (arrowIndex !== -1) {
    const left = trimmed.slice(0, arrowIndex).trim();
    const right = trimmed.slice(arrowIndex + 2).trim();
    const args = parseFunctionArgs(left, warnings);
    const returnType = parseType(right, warnings);
    return `(${args.join(", ")}) => ${returnType}`;
  }
  return parsePrimary(trimmed, warnings);
}

function parseFunctionArgs(input: string, warnings: string[]): string[] {
  const trimmed = stripOuterParens(input.trim());
  const withoutDot =
    trimmed.startsWith(".") ? trimmed.slice(1).trim() : trimmed;
  const args = splitTopLevel(withoutDot, ",");
  if (args.length <= 1) {
    return [`arg0: ${parseType(withoutDot, warnings)}`];
  }
  return args.map((arg, index) => `arg${index}: ${parseType(arg, warnings)}`);
}

function parsePrimary(input: string, warnings: string[]): string {
  if (isTuple(input)) {
    const inner = stripOuterParens(input);
    const parts = splitTopLevel(inner, ",");
    return `[${parts.map((part) => parseType(part, warnings)).join(", ")}]`;
  }
  if (input.startsWith("{") && input.endsWith("}")) {
    return parseRecord(input, warnings);
  }
  const typeApp = parseTypeApplication(input);
  if (typeApp) {
    return resolveTypeApplication(typeApp, warnings);
  }
  if (input.startsWith("'")) {
    warnings.push(`type variable ${input} treated as unknown`);
    return "unknown";
  }
  if (builtinTypes[input]) {
    return builtinTypes[input];
  }
  if (input.includes(".")) {
    warnings.push(`unresolved type ${input} treated as unknown`);
    return "unknown";
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(input)) {
    warnings.push(`unresolved type ${input} treated as unknown`);
    return "unknown";
  }
  warnings.push(`unsupported type ${input} treated as unknown`);
  return "unknown";
}

function parseRecord(input: string, warnings: string[]): string {
  const inner = input.slice(1, -1).trim();
  if (!inner) {
    return "{}";
  }
  const parts = splitTopLevel(inner, ",");
  const fields = parts.map((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return "";
    }
    const cleaned = trimmed.replace(/^mutable\s+/, "");
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex === -1) {
      warnings.push(`unsupported record field ${cleaned}`);
      return "";
    }
    const name = cleaned.slice(0, colonIndex).trim();
    const type = cleaned.slice(colonIndex + 1).trim();
    const safeName = name.replace(/^[\"']|[\"']$/g, "");
    return `${safeName}: ${parseType(type, warnings)}`;
  });
  return `{ ${fields.filter(Boolean).join("; ")} }`;
}

function parseTypeApplication(input: string) {
  const angleIndex = findTopLevelChar(input, "<");
  if (angleIndex === -1 || !input.endsWith(">")) {
    return null;
  }
  const callee = input.slice(0, angleIndex).trim();
  const argsRaw = input.slice(angleIndex + 1, -1);
  const args = splitTopLevel(argsRaw, ",");
  return { callee, args };
}

function resolveTypeApplication(
  app: { callee: string; args: string[] },
  warnings: string[],
): string {
  const callee = app.callee;
  const args = app.args.map((arg) => parseType(arg, warnings));

  if (callee === "array" || callee === "list") {
    return `Array<${args[0] ?? "unknown"}>`;
  }
  if (callee === "option") {
    return `(${args[0] ?? "unknown"} | undefined)`;
  }
  if (callee === "promise" || callee === "Promise") {
    return `Promise<${args[0] ?? "unknown"}>`;
  }
  if (callee === "Js.Nullable.t") {
    return `(${args[0] ?? "unknown"} | null | undefined)`;
  }
  if (callee === "Js.Promise.t") {
    return `Promise<${args[0] ?? "unknown"}>`;
  }

  warnings.push(`unresolved type ${callee} treated as unknown`);
  return "unknown";
}

function stripOuterParens(input: string): string {
  if (input.startsWith("(") && input.endsWith(")")) {
    const inner = input.slice(1, -1);
    if (isBalanced(inner)) {
      return inner.trim();
    }
  }
  return input;
}

function isTuple(input: string): boolean {
  if (!(input.startsWith("(") && input.endsWith(")"))) {
    return false;
  }
  const inner = input.slice(1, -1);
  return splitTopLevel(inner, ",").length > 1;
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let i = 0;
  let depthParen = 0;
  let depthAngle = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\"" || ch === "'") {
      const end = skipString(input, i);
      current += input.slice(i, end);
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
      ch === separator &&
      depthParen === 0 &&
      depthAngle === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
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

function findTopLevelArrow(input: string): number {
  let i = 0;
  let depthParen = 0;
  let depthAngle = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  while (i < input.length - 1) {
    const ch = input[i];
    if (ch === "\"" || ch === "'") {
      i = skipString(input, i);
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
      input.slice(i, i + 2) === "=>" &&
      depthParen === 0 &&
      depthAngle === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
      return i;
    }
    i += 1;
  }
  return -1;
}

function findTopLevelChar(input: string, target: string): number {
  let i = 0;
  let depthParen = 0;
  let depthAngle = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\"" || ch === "'") {
      i = skipString(input, i);
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
      ch === target &&
      depthParen === 0 &&
      depthAngle === 0 &&
      depthBrace === 0 &&
      depthBracket === 0
    ) {
      return i;
    }
    i += 1;
  }
  return -1;
}

function isBalanced(input: string): boolean {
  let depth = 0;
  for (const ch of input) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function skipString(input: string, start: number): number {
  const quote = input[start];
  let i = start + 1;
  while (i < input.length) {
    const ch = input[i];
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
