# Interactive CLI Flow Design

## Purpose

Agent Session Pack is a CLI-only tool for reducing local disk usage from AI coding-agent
session history while preserving byte-exact restore into provider-native formats. The
interactive CLI should feel like a safe storage assistant: it explains what will happen,
shows evidence before mutation, and keeps every destructive action behind an explicit
confirmation.

## Scope

This design covers the human TTY flow for first setup, savings checks, session review,
pack, restore, and doctor entrypoints. It does not install lifecycle hooks, run a daemon,
mutate Cursor native storage, mutate Devin native storage, or change the JSON automation
contract.

## CLI Shape

Agent Session Pack remains a hybrid CLI:

- `citty` owns commands, flags, help output, and scriptable behavior.
- `@clack/prompts` owns short interactive flows in TTY mode.
- `--json`, non-TTY calls, and explicit command invocations never prompt or hang.
- Bare `agent-session-pack` in a TTY opens the interactive safety menu.

## First Screen

Bare TTY invocation starts with a concise explanation before showing actions:

```text
Agent Session Pack

Compress old local AI-agent sessions without breaking resume.

How it works:
  1. Scans provider stores read-only
  2. Proves savings on copied files first
  3. Packs only cold sessions into ~/.agent-session-pack
  4. Verifies byte-exact restore
  5. Removes originals only after verification

No daemon. No background deletion. Cursor and Devin stay backup-only for now.
```

## Main Menu

Each option includes a dimmed description with an example-level explanation.

```text
? What do you want to do?

> First setup          choose providers, vault path, cold threshold, and safety defaults
  Check savings        copy-only proof; shows what you could save without touching sessions
  Review sessions      scan all providers; show dates, paths, size, cold/active status
  Pack cold sessions   dry-run first; apply only after verified archive + confirmation
  Restore sessions     unpack archived sessions back to native provider paths
  Doctor               check zstd, sqlite, provider roots, vault health, and config
  Exit                 leave without changing files
```

## First Setup Flow

Setup writes configuration only. It does not pack, delete, restore, or mutate provider
session files.

The setup flow begins with animated loading while provider discovery runs:

```text
Scanning provider stores...
```

The spinner text names the work being done and stops before rendering the provider table.
Spinner output is TTY-only and is never emitted in `--json` mode.

After scanning, setup shows discovered providers:

```text
Detected providers

Provider   Mode         Sessions   Path
codex      archive      558        ~/.codex/sessions
claude     archive      176        ~/.claude/projects
kiro       archive      227        ~/.kiro/sessions
devin      backup-only  8          ~/.local/share/devin/cli/sessions.db
cursor     backup-only  0          Cursor profile/session stores
```

Provider selection is a multi-select prompt:

```text
? Which providers should Agent Session Pack manage?

> codex      archive old JSONL sessions; restore byte-exact when needed
  claude     archive old Claude Code project sessions
  kiro       archive old Kiro CLI sessions
  devin      backup-only proof; native mutation disabled for safety
  cursor     backup-only proof; native mutation disabled for safety
```

Rules:

- Archive-mode providers may be selected for scan, savings, pack, and restore.
- Backup-only providers may be selected for scan and savings, but not destructive pack.
- The prompt must allow selecting multiple providers.
- The prompt must allow canceling without writing config.
- Empty selection returns to the same prompt with a short explanation.

Cold threshold selection follows:

```text
? When is a session considered cold?

> 7 days      recommended; protects normal active work
  14 days     safer for long-running sessions
  30 days     conservative cleanup
  Custom      enter 12h, 7d, 2w, or 30d
```

The vault path prompt validates the path before continuing:

```text
? Where should archives be stored?

> ~/.agent-session-pack    default local vault; manifests and compressed archives live here
  Custom path              useful for external drive or synced disk
```

Validation rules:

- Expand `~` against `HOME`.
- Reject an empty path.
- Reject paths inside known provider stores such as `~/.codex`, `~/.claude`, and `~/.kiro`.
- If the path exists, it must be a directory and writable.
- If the path does not exist, the parent directory must exist and be writable.
- The setup summary must show the resolved absolute path.
- Config writes create the vault directory only after final confirmation.

Setup ends with a full summary:

```text
Setup summary

Providers: codex, claude, kiro
Vault: /Users/example/.agent-session-pack
Cold after: 7 days
Safety:
  - dry-run before apply
  - recent sessions guarded
  - restore verified before original removal
  - changed live files never overwritten

? Save this setup?
```

## Savings Flow

The savings flow proves compression on copied data only.

```text
Checking savings...
```

After the copy-only proof, render the existing human evidence table and finish with:

```text
Original sessions touched: no
Next: run Pack cold sessions when you are ready to archive cold files.
```

## Review Sessions Flow

The review flow scans configured or selected providers and shows a dense table that helps
the user understand what is active, cold, archived, or backup-only.

```text
Scanning provider stores...

Provider   Sessions   Cold   Guarded recent   Size     Path
codex      558        480    78               2.2 GB   ~/.codex/sessions
claude     176        120    56               1.4 GB   ~/.claude/projects
kiro       227        0      227              0 B      ~/.kiro/sessions
```

The table must include paths because users need to understand where disk usage lives.

## Pack Flow

The pack flow always starts as a dry-run in interactive mode:

```text
Pack cold sessions

Scanning provider stores...
```

Then render a candidate table:

```text
Provider   Sessions   Cold   Guarded recent   Candidate size   Path
codex      558        480    78               2.2 GB           ~/.codex/sessions
claude     176        120    56               1.4 GB           ~/.claude/projects
kiro       227        0      227              0 B              ~/.kiro/sessions
```

Rules:

- Sessions newer than the cold threshold are labeled guarded recent.
- Guarded recent sessions are not candidates.
- Backup-only providers are shown for visibility and skipped for destructive pack.
- The first confirmation starts a dry-run preview only.
- The second confirmation applies the verified archive workflow.
- Apply text must name the provider count, candidate session count, candidate size, and vault path.

Final confirmation copy:

```text
Apply pack now?

This will archive 600 cold sessions from codex and claude into:
/Users/example/.agent-session-pack

Original files are removed only after archive write, restore verification, and manifest write.
```

## Restore Flow

The restore flow scans the vault first:

```text
Scanning vault manifests...
```

Then it shows archived sessions by provider:

```text
Provider   Archived   Restore target                  Conflicts
codex      480        original provider paths         0
claude     120        original provider paths         0
kiro       0          original provider paths         0
```

Rules:

- Changed live files are never overwritten.
- Conflicts are shown before confirmation.
- Restore apply requires explicit confirmation.
- Restore success prints the next useful command: `agent-session-pack scan`.

## Doctor Flow

Doctor stays command-shaped but becomes reachable from the interactive menu. It should
check external binaries, provider roots, vault path, config readability, and backup-only
provider constraints. Failures should include the command needed to fix the issue.

## Automation Contract

All existing commands remain stable:

```bash
agent-session-pack check [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack init [--apply] [--json]
agent-session-pack scan [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack pack [--all-providers|--provider codex|claude|kiro|cursor|devin] [--older-than 7d] [--dry-run|--apply] [--yes] [--json]
agent-session-pack unpack [--all-providers|--provider codex|claude|kiro|cursor|devin] [--apply] [--yes] [--json]
agent-session-pack savings [--provider codex|claude|kiro|cursor|devin] [--json]
```

Non-TTY behavior:

- No prompt.
- No spinner.
- No ANSI-only descriptions.
- `--json` emits stable JSON only.
- Apply mode requires `--yes` or an explicit confirmation path.

## Error And Empty States

- Missing `HOME`: print `HOME is not set.` and exit non-zero.
- No providers found: show provider root examples and offer Doctor or Exit.
- No cold candidates: show sessions found and guarded count, then exit with no changes.
- Invalid vault path: keep the user in the path prompt with a clear reason.
- Missing `zstd`: show Doctor result and install guidance.
- User cancel: print `No files changed.`.
- Apply failure: preserve original files unless the verified archive workflow completed.

## Implementation Notes

- Keep provider modules read-only.
- Put prompt orchestration in `src/cli`, not in core workflows.
- Keep destructive behavior inside existing core archive/restore workflows.
- Build prompt choices from provider discovery results so option descriptions include real
  session counts, modes, and paths.
- Use Clack spinner only for TTY loading states.
- Use shared renderers for tables where possible so command and interactive output stay
  consistent.

## Acceptance Criteria

- Bare `agent-session-pack` in a TTY opens the guided safety menu.
- Main menu options include dim descriptions with example-level context.
- First setup explains the safety model before asking questions.
- Provider setup uses multi-select.
- Vault path setup validates before summary and final confirmation.
- Provider scanning shows animated loading in TTY mode.
- Pack flow shows cold and guarded-recent counts before apply.
- Backup-only providers are visible but skipped for destructive pack.
- `--json` and non-TTY behavior never prompt or emit spinner output.
- Existing scriptable commands continue to work.
