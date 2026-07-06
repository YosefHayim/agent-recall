# Interactive CLI Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved guided Clack CLI flow for Agent Session Pack with first setup, provider multi-select, vault path validation, spinner-backed scans, and safe pack/restore entrypoints.

**Architecture:** Keep command parsing and automation in `citty`, keep prompt orchestration in `src/cli`, and keep filesystem validation plus provider inventory summaries in `src/core`. Interactive flows call the same command/core workflows used by scriptable commands so JSON output and destructive safety stay consistent.

**Tech Stack:** TypeScript, Effect, Effect Schema, citty, @clack/prompts, Vitest, Biome, ESLint.

## Global Constraints

- Agent Session Pack is CLI-only.
- No daemon in v1.
- No local web app in v1.
- No mutation of Cursor's native storage in v1.
- No mutation of Devin's native storage in v1.
- No lossy conversion of session logs.
- No background deletion of real session files.
- Provider modules stay read-only.
- Destructive behavior stays in core archive/restore workflows.
- `--json`, non-TTY calls, and explicit command invocations never prompt or hang.
- Bare `agent-session-pack` in a TTY opens the interactive safety menu.
- Provider setup uses multi-select.
- Vault path setup validates before summary and final confirmation.
- Provider scanning shows animated loading in TTY mode.

---

### Task 1: Setup Config And Vault Path Validation

**Files:**
- Create: `src/core/setupConfig.ts`
- Modify: `src/core/index.ts`
- Test: `tests/setupConfig.test.ts`

**Interfaces:**
- Produces: `expandHomePath(path, home)`, `resolveConfigPath(home)`, `validateVaultPath(request)`, `writeSetupConfig(request)`.
- Consumes: `ProviderIdSchema` and `ProviderId` from `src/core/sessionStore.ts`.

- [ ] **Step 1: Write failing validation tests**

```ts
import { mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  expandHomePath,
  validateVaultPath,
  writeSetupConfig,
} from '../src/core/setupConfig.js';

describe('setup config vault paths', () => {
  it('expands home paths and accepts a new vault below a writable parent', async () => {
    const home = await mkdir(join(tmpdir(), 'agent-session-pack-home-'), { recursive: true });
    const resolved = await Effect.runPromise(
      validateVaultPath({
        home,
        inputPath: '~/.agent-session-pack',
        providerRoots: [join(home, '.codex', 'sessions')],
      }),
    );

    expect(resolved.path).toBe(join(home, '.agent-session-pack'));
    expect(expandHomePath('~/vault', home)).toBe(join(home, 'vault'));
  });

  it('rejects vault paths inside provider stores', async () => {
    const home = await mkdir(join(tmpdir(), 'agent-session-pack-provider-'), { recursive: true });
    const providerRoot = join(home, '.codex', 'sessions');
    await mkdir(providerRoot, { recursive: true });

    await expect(
      Effect.runPromise(
        validateVaultPath({
          home,
          inputPath: join(providerRoot, 'vault'),
          providerRoots: [providerRoot],
        }),
      ),
    ).rejects.toMatchObject({
      _tag: 'VaultPathValidationError',
      reason: 'inside-provider-store',
    });
  });

  it('writes config and creates the vault only after setup confirmation', async () => {
    const home = await mkdir(join(tmpdir(), 'agent-session-pack-write-'), { recursive: true });
    const vaultPath = join(home, '.agent-session-pack');

    await Effect.runPromise(
      writeSetupConfig({
        home,
        config: {
          version: 1,
          providers: ['codex', 'claude'],
          vaultPath,
          coldAfter: '7d',
          createdAt: '2026-07-07T00:00:00.000Z',
          updatedAt: '2026-07-07T00:00:00.000Z',
        },
      }),
    );

    await expect(stat(vaultPath)).resolves.toMatchObject({ isDirectory: expect.any(Function) });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/setupConfig.test.ts`

Expected: fails because `src/core/setupConfig.ts` does not exist.

- [ ] **Step 3: Implement setup config helpers**

Create `src/core/setupConfig.ts` with Effect Schema config decoding, path expansion, provider-store rejection, writable parent validation, and config write to `~/.agent-session-pack/config.json`.

- [ ] **Step 4: Export helpers**

Add `export * from './setupConfig.js';` to `src/core/index.ts`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/setupConfig.test.ts`

Expected: all setup config tests pass.

### Task 2: Provider Inventory Summaries

**Files:**
- Create: `src/core/providerInventory.ts`
- Modify: `src/core/index.ts`
- Test: `tests/providerInventory.test.ts`

**Interfaces:**
- Produces: `inspectProviderInventory(request)` returning provider rows with session count, cold count, guarded recent count, bytes, mode, and paths.
- Consumes: provider adapters from `src/providers/index.ts`.

- [ ] **Step 1: Write failing inventory tests**

Create tests that build temp Codex JSONL files with old and recent mtimes, call `inspectProviderInventory`, and assert `coldSessions`, `guardedRecentSessions`, `candidateBytes`, and `paths`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/providerInventory.test.ts`

Expected: fails because `providerInventory.ts` does not exist.

- [ ] **Step 3: Implement provider inventory**

Implement read-only provider discovery across existing roots. Classify archive-mode sessions older than the cutoff as cold and newer sessions as guarded recent. Backup-only providers report sessions and paths but zero cold destructive candidates.

- [ ] **Step 4: Export inventory**

Add `export * from './providerInventory.js';` to `src/core/index.ts`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/providerInventory.test.ts`

Expected: inventory test passes.

### Task 3: Interactive Clack Prompt Flow

**Files:**
- Create: `src/cli/interactiveCli.ts`
- Modify: `src/cli/main.ts`
- Modify: `src/cli/commands/initCommand.ts`
- Test: `tests/interactiveCli.test.ts`
- Test: `tests/mainEntrypoint.test.ts`

**Interfaces:**
- Produces: `shouldRunInteractiveCli(argv, stdin, stdout)`, `runInteractiveCli(request)`, `runFirstSetup(request)`.
- Consumes: setup config helpers, provider inventory, pack/unpack command runners, savings command runner, scan command runner, doctor command runner.

- [ ] **Step 1: Write failing interactive tests**

Create tests with a fake prompt adapter that assert main-menu option hints exist, setup provider prompt is multi-select, vault path validation is called, and bare TTY detection returns true only when no subcommand or flags are present.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/interactiveCli.test.ts tests/mainEntrypoint.test.ts`

Expected: fails because the interactive module and bare TTY detection do not exist.

- [ ] **Step 3: Implement interactive orchestration**

Use `@clack/prompts` `intro`, `note`, `select`, `multiselect`, `text`, `confirm`, `spinner`, `outro`, `cancel`, and `isCancel`. Keep prompt code in `src/cli/interactiveCli.ts` and call existing command runners for check, review, pack, restore, and doctor actions.

- [ ] **Step 4: Wire bare TTY and init**

Update `src/cli/main.ts` so bare TTY invocation calls `runInteractiveCli`. Update `initCommand` so TTY non-JSON runs `runFirstSetup`; non-TTY and `--json` remain non-interactive.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/interactiveCli.test.ts tests/mainEntrypoint.test.ts`

Expected: tests pass and existing entrypoint behavior remains stable.

### Task 4: Output, Docs, And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `CODE-STYLE.md`
- Modify: `src/output/packOutput.ts`
- Test: `tests/packAllProvidersCommand.test.ts`
- Test: `tests/humanOutput.test.ts`

**Interfaces:**
- Consumes: `ProviderInventoryReport` for interactive tables.
- Keeps: `formatHumanPackReport`, `formatHumanUnpackReport`, and JSON output stable for automation.

- [ ] **Step 1: Write or update failing output tests**

Assert pack dry-run output no longer says apply is blocked, and human-facing tables include the guided setup language where applicable.

- [ ] **Step 2: Run focused output tests**

Run: `pnpm vitest run tests/packAllProvidersCommand.test.ts tests/humanOutput.test.ts`

Expected: tests fail before output copy is corrected.

- [ ] **Step 3: Update output and docs**

Remove stale pack text, document bare `agent-session-pack`, `agent-session-pack init`, provider multi-select, path validation, and spinner-backed scans.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run tests/packAllProvidersCommand.test.ts tests/humanOutput.test.ts`

Expected: focused tests pass.

- [ ] **Step 5: Run full verification**

Run:

```bash
pnpm check:ci
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.
