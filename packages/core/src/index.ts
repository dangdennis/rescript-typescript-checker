import path from "node:path";
import type { CheckOptions, CheckResult, Diagnostic } from "./types.js";
import { collectExternalDecls } from "./rescript/externals.js";
import { findRescriptConfig } from "./rescript/discover.js";
import { checkWithTypeScript } from "./ts/ts-checker.js";

export async function checkBindings(
  options: CheckOptions = {},
): Promise<CheckResult> {
  const cwd = path.resolve(options.dir ?? options.cwd ?? process.cwd());
  const rescriptConfig = findRescriptConfig(cwd);
  if (!rescriptConfig) {
    return {
      summary: { externals: 0, errors: 1, warnings: 0 },
      diagnostics: [
        {
          level: "error",
          message: "rescript.json not found in this directory tree.",
          file: cwd,
          line: 1,
          column: 1,
        },
      ],
    };
  }

  const externals = collectExternalDecls(rescriptConfig.sourceDirs);
  const tsResult = checkWithTypeScript(rescriptConfig.rootDir, externals);
  const diagnostics = [...tsResult.diagnostics];

  const summary = summarizeDiagnostics(diagnostics, externals.length);
  return { summary, diagnostics };
}

export type { CheckOptions, CheckResult, Diagnostic } from "./types.js";

function summarizeDiagnostics(
  diagnostics: Diagnostic[],
  externals: number,
) {
  let errors = 0;
  let warnings = 0;
  for (const diag of diagnostics) {
    if (diag.level === "error") {
      errors += 1;
    } else if (diag.level === "warning") {
      warnings += 1;
    }
  }
  return { externals, errors, warnings };
}
