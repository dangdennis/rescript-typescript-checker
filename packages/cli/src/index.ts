#!/usr/bin/env node
import process from "node:process";
import { checkBindings } from "res-ts-core";

const args = process.argv.slice(2);

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function run() {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  const command = args[0];
  if (command !== "check") {
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  const { dir, json } = parseCheckArgs(args.slice(1));
  const result = await checkBindings({ dir });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printPretty(result);
  }

  if (result.summary.errors > 0) {
    process.exitCode = 1;
  }
}

function parseCheckArgs(rest: string[]) {
  let dir: string | undefined;
  let json = false;
  for (const arg of rest) {
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (!dir) {
      dir = arg;
      continue;
    }
  }
  return { dir, json };
}

function printHelp() {
  console.log(`res-ts check [dir] [--json]

Commands:
  check [dir]       Check ReScript externals against TypeScript types.

Options:
  --json            Output machine-readable JSON.
  -h, --help        Show help.
`);
}

function printPretty(result: Awaited<ReturnType<typeof checkBindings>>) {
  const { summary, diagnostics } = result;
  console.log(
    `Checked ${summary.externals} externals: ${summary.errors} error(s), ${summary.warnings} warning(s).`,
  );
  for (const diag of diagnostics) {
    const location = `${diag.file}:${diag.line}:${diag.column}`;
    console.log(`${location} ${diag.level.toUpperCase()} ${diag.message}`);
  }
}
