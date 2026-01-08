# rescript-typescript-checker

Type-check ReScript externals against real TypeScript types.

## Setup

```bash
bun install
```

## Build

```bash
bun run --cwd packages/core build
bun run --cwd packages/cli build
```

## CLI

```bash
bun run --cwd packages/cli build
node packages/cli/dist/index.js check .
node packages/cli/dist/index.js check path/to/project --json
```

## ReScript tests

```bash
bun run test:rescript
```
