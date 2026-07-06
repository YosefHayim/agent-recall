<p align="center">
  <img src="assets/hero.png" alt="Agent Session Pack - shrink local AI coding-agent session history into a tiny verified archive" width="640" />
</p>

# Agent Session Pack

Cold storage for local AI coding-agent sessions.

[npm package](https://www.npmjs.com/package/agent-session-pack)

Agent Session Pack is a CLI-only tool for developers and coding agents with large local
session histories. It scans provider stores, proves compression on copied files, packs cold
sessions into a local vault, and restores them byte-exact into provider-native formats.

Current status: guided setup, read-only proof, manual pack, and manual unpack. No daemon,
timer, lifecycle hook, web app, or background deletion is installed in v1.

## Quick Start

Run the safest proof from anywhere:

```bash
npx --yes agent-session-pack check
```

This scans supported local AI agents, copies one eligible session per provider into a temp
proof workspace, compresses the copy, restores it, compares hashes, and prints a before/after
savings table. Real session files stay untouched.

Open the guided menu without installing globally:

```bash
npx --yes agent-session-pack
```

From this repo:

```bash
pnpm install
pnpm dev
```

Installed globally:

```bash
npm install -g agent-session-pack
agent-session-pack
```

## What Runs Today

```text
+-----------------------------+
| agent-session-pack setup    |
| choose providers            |
| choose cold threshold       |
| choose vault path           |
+--------------+--------------+
               |
               v
+-----------------------------+
| ~/.agent-session-pack       |
| config only                 |
| no timer                    |
| no hook                     |
| no compression yet          |
+-----------------------------+
```

Setup only saves policy. It does not wait for the threshold and compress later. Compression
happens only when you run a pack command.

## Safe Proof Flow

```text
+------------------+      +-------------------+      +------------------+
| provider stores  | ---> | temp proof copy   | ---> | savings table    |
| read-only scan   |      | compress copy     |      | before / after   |
| no writes        |      | restore copy      |      | hash exact       |
+------------------+      +-------------------+      +------------------+
```

Use:

```bash
npx --yes agent-session-pack check
npx --yes agent-session-pack savings
```

`check` and `savings` are copy-only proof commands. They are the best first commands when
you want evidence before touching originals.

## Manual Pack Flow

Dry-run first:

```bash
npx --yes agent-session-pack pack --all-providers --older-than 1d
```

Apply after reviewing the table:

```bash
npx --yes agent-session-pack pack --all-providers --older-than 1d --apply
```

Non-interactive apply for automation:

```bash
npx --yes agent-session-pack pack --all-providers --older-than 1d --apply --yes
```

```text
+-----------------------------+
| pack --older-than 1d        |
| find sessions older than    |
| the rolling cutoff          |
+--------------+--------------+
               |
               v
+-----------------------------+      if --apply is present      +-----------------------------+
| cold sessions only          | ------------------------------> | ~/.agent-session-pack       |
| recent sessions stay live   |                                 | archive + manifest          |
+--------------+--------------+                                 +--------------+--------------+
               |                                                               |
               | no --apply                                                     |
               v                                                               v
+-----------------------------+                                 +-----------------------------+
| dry-run table               |                                 | restore check by hash       |
| originals untouched         |                                 | then remove original        |
+-----------------------------+                                 +-----------------------------+
```

`--older-than` is the age filter. Examples:

- `--older-than 12h`: pack only sessions modified more than 12 hours ago.
- `--older-than 1d`: pack sessions older than 24 hours, so today/recent work stays live.
- `--older-than 7d`: default cold-session policy.
- `--older-than 30d`: conservative cleanup for older history only.

`--yes` has two different meanings depending where it appears:

- `npx --yes agent-session-pack ...`: npm runs the package without asking to install it.
- `agent-session-pack pack ... --apply --yes`: Agent Session Pack skips the apply prompt.

## Manual Restore Flow

Preview what is in the vault:

```bash
npx --yes agent-session-pack unpack --all-providers
```

Restore archived sessions back to their original provider paths:

```bash
npx --yes agent-session-pack unpack --all-providers --apply
```

```text
+-----------------------------+      unpack --apply       +-----------------------------+
| ~/.agent-session-pack       | ------------------------> | original provider paths     |
| archive + manifest          |                           | byte-exact restored files   |
+-----------------------------+                           +-----------------------------+
```

Changed live files are skipped instead of overwritten.

## Providers

Archive/remove/restore support targets:

- Codex
- Claude Code user-level sessions
- Kiro

Backup-only providers are visible in scan/proof output but are not destructively packed:

- Cursor
- Devin

Devin discovery reads `~/.local/share/devin/cli/sessions.db` as SQLite metadata and never
reads credentials.

## Planned Lifecycle Hooks

This is the target flow, not the current v1 behavior:

```text
+-----------------------------+
| one-time setup              |
| pick providers + vault      |
| confirm cold threshold      |
+--------------+--------------+
               |
               v
+-----------------------------+      agent relaunch      +-----------------------------+
| compressed vault            | -----------------------> | restore needed session     |
| archives + manifests        |                          | into native format         |
+--------------+--------------+                          +--------------+--------------+
               ^                                                    |
               |                                                    |
               | agent closes                                       |
               +------------------ pack cold sessions <-------------+
                                  after verification
```

The lifecycle hook work is intentionally not installed yet. The current project stays manual
so users can inspect savings and confirm every write.

## Command Reference

Common human commands:

```bash
agent-session-pack
agent-session-pack check [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack doctor [--json]
agent-session-pack init [--apply] [--json]
agent-session-pack scan [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack savings [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack pack [--all-providers|--provider codex|claude|kiro|cursor|devin] [--older-than 7d] [--dry-run|--apply] [--yes] [--json]
agent-session-pack unpack [--all-providers|--provider codex|claude|kiro|cursor|devin] [--apply] [--yes] [--json]
```

Scaffolded or future-facing commands:

```bash
agent-session-pack list [--provider codex|claude|kiro|cursor|devin] [--json]
agent-session-pack restore <selector> [--to original|<path>] [--json]
```

Local development aliases:

```bash
pnpm health
pnpm dev
pnpm dev --check
pnpm dev --doctor
pnpm savings
pnpm evidence:local
pnpm pack:dry-run
pnpm pack:all
pnpm unpack:all
```

`pnpm doctor` is pnpm's own built-in command, so this repo uses `pnpm health`.
`pnpm pack:all` is a dry-run summary because the script does not pass `--apply`.

## Safety Model

Agent Session Pack is built around byte-exact restore, not best-effort compression.

- Normal tests use fixtures only.
- `check` and `savings` work on copied session files and report originals as untouched.
- `pack --all-providers` defaults to dry-run.
- `pack --all-providers --apply` asks for `y` in a TTY unless app-level `--yes` is passed.
- Apply mode writes an archive, verifies byte-exact restore, writes a manifest, and only then removes the original.
- `unpack --all-providers --apply` restores from manifests and skips changed live files.
- Cursor and Devin are backup-only until their storage models are safer to mutate.

## Local Evidence

This is one machine's evidence, not a universal benchmark.

| Provider | Before | After | Saved |
| --- | ---: | ---: | ---: |
| Codex | 2.22 GB | 782 MB | 65.6% |
| Claude | 2.10 GB | 457 MB | 78.7% |
| Kiro | 1.95 GB | 190 MB | 90.5% |
| Cursor backup | 7.27 GB | 957 MB | 87.1% |
| Total | 13.5 GB | 2.3 GB | about 83% |

Committed fixtures in `examples/roundtrip/` show before/archive/after files for small
sessions. Local proof with real sessions is generated by `pnpm savings` because real
provider stores should not be committed.

| Provider | Source | Archive | Saved | Lines | Byte exact | Original touched |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Kiro latest | 1,160,471 B | 132,557 B | 88.6% | 266 | yes | no |
| Claude oldest | 6,470,568 B | 1,265,093 B | 80.4% | 2,722 | yes | no |
| Codex oldest | 104,229 B | 25,422 B | 75.6% | 24 | yes | no |
| Devin local DB | 97,058,816 B | 13,425,614 B | 86.2% | n/a | yes | no |

## Development

```bash
pnpm check:ci
pnpm typecheck
pnpm test
pnpm build
npm publish --dry-run
```

Project intent lives in `PROJECT.md`. Agent editing rules live in `AGENTS.md`; code style
and command contracts live in `CODE-STYLE.md`. Deeper decisions live in `docs/adr/current/`.
