import path from "node:path";
import ts from "typescript";
import type { Diagnostic, ExternalDecl } from "../types.js";
import { rescriptTypeToTs } from "./rescript-to-ts.js";

interface SyntheticResult {
  diagnostics: Diagnostic[];
}

export function checkWithTypeScript(
  cwd: string,
  externals: ExternalDecl[],
): SyntheticResult {
  const diagnostics: Diagnostic[] = [];
  if (externals.length === 0) {
    return { diagnostics };
  }

  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, "tsconfig.json");
  const compilerOptions = configPath
    ? loadTsConfig(configPath)
    : defaultCompilerOptions(cwd);

  const { sourceText, indexMap } = buildSyntheticSource(externals);
  const syntheticPath = path.join(cwd, ".res-ts.synthetic.ts");

  const host = ts.createCompilerHost(compilerOptions, true);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    if (path.resolve(fileName) === path.resolve(syntheticPath)) {
      return ts.createSourceFile(
        syntheticPath,
        sourceText,
        languageVersion,
        true,
        ts.ScriptKind.TS,
      );
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  const originalReadFile = host.readFile.bind(host);
  host.readFile = (fileName) => {
    if (path.resolve(fileName) === path.resolve(syntheticPath)) {
      return sourceText;
    }
    return originalReadFile(fileName);
  };

  const program = ts.createProgram([syntheticPath], compilerOptions, host);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(syntheticPath);
  if (!sourceFile) {
    diagnostics.push({
      level: "error",
      message: "Failed to load synthetic TypeScript source.",
      file: syntheticPath,
      line: 1,
      column: 1,
    });
    return { diagnostics };
  }

  const aliasMap = collectAliasTypes(sourceFile, checker);

  for (const [index, ext] of externals.entries()) {
    const entry = indexMap.get(index);
    if (!entry) {
      continue;
    }
    const actual = aliasMap.get(entry.actualName);
    const expected = aliasMap.get(entry.expectedName);
    if (!actual || !expected) {
      diagnostics.push({
        level: "error",
        message: "Failed to resolve TypeScript types for external.",
        file: ext.file,
        line: ext.line,
        column: ext.column,
      });
      continue;
    }

    const actualOk = checker.isTypeAssignableTo(actual, expected);
    if (!actualOk) {
      diagnostics.push({
        level: "error",
        message: `Type mismatch for ${ext.name}: expected ${checker.typeToString(
          expected,
        )}, got ${checker.typeToString(actual)}.`,
        file: ext.file,
        line: ext.line,
        column: ext.column,
      });
    }
  }

  return { diagnostics };
}

function buildSyntheticSource(externals: ExternalDecl[]) {
  const imports = new Map<string, string>();
  const lines: string[] = [];
  const indexMap = new Map<
    number,
    { actualName: string; expectedName: string }
  >();

  for (const ext of externals) {
    if (ext.attributes.module) {
      if (!imports.has(ext.attributes.module)) {
        imports.set(ext.attributes.module, `__mod${imports.size}`);
      }
    }
  }

  for (const [moduleName, localName] of imports.entries()) {
    lines.push(`import * as ${localName} from "${moduleName}";`);
  }
  lines.push("type __Global = typeof globalThis;");

  externals.forEach((ext, index) => {
    const expected = rescriptTypeToTs(ext.resType);
    const expectedName = `__expected_${index}`;
    const actualName = `__actual_${index}`;
    indexMap.set(index, { actualName, expectedName });

    for (const warning of expected.warnings) {
      lines.push(`// warning: ${warning}`);
    }
    lines.push(`type ${expectedName} = ${expected.typeText};`);
    lines.push(`type ${actualName} = ${buildActualTypeQuery(ext, imports)};`);
  });

  return { sourceText: lines.join("\n"), indexMap };
}

function buildActualTypeQuery(
  ext: ExternalDecl,
  imports: Map<string, string>,
) {
  const bindingName = ext.attributes.as ?? ext.binding ?? ext.name;
  const pathParts = bindingName.split(".");
  if (ext.attributes.module) {
    const local = imports.get(ext.attributes.module);
    const scope = ext.attributes.scope ?? [];
    const fullPath = [local ?? "", ...scope, ...pathParts].filter(Boolean);
    return `typeof ${buildPropertyAccess(fullPath)}`;
  }

  const scope = ext.attributes.scope ?? [];
  const fullPath = ["__Global", ...scope, ...pathParts];
  return `typeof ${buildPropertyAccess(fullPath)}`;
}

function buildPropertyAccess(parts: string[]): string {
  if (parts.length === 0) {
    return "__Global";
  }
  const [first, ...rest] = parts;
  return rest.reduce((acc, part) => {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)) {
      return `${acc}.${part}`;
    }
    return `${acc}[${JSON.stringify(part)}]`;
  }, first);
}

function collectAliasTypes(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
) {
  const aliasMap = new Map<string, ts.Type>();
  for (const statement of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(statement)) {
      continue;
    }
    const name = statement.name.text;
    const type = checker.getTypeFromTypeNode(statement.type);
    aliasMap.set(name, type);
  }
  return aliasMap;
}

function loadTsConfig(configPath: string): ts.CompilerOptions {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return defaultCompilerOptions(path.dirname(configPath));
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );
  return { ...parsed.options, noEmit: true };
}

function defaultCompilerOptions(cwd: string): ts.CompilerOptions {
  return {
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ["lib.es2022.d.ts"],
    types: [],
    skipLibCheck: true,
    strict: true,
    baseUrl: cwd,
  };
}
