# ADR 0002: Archive Safety Model

## Status

Accepted.

## Context

The tool handles local AI session files that developers may rely on to resume work. Data loss is unacceptable.

## Decision

Packing is dry-run first. Apply mode must require explicit confirmation, write an archive, verify byte-exact restore by SHA-256, write metadata, and only then remove the original. Unpack apply mode restores from manifests and refuses to overwrite changed live files. Provider modules are read-only. Destructive behavior lives in core archive/restore workflows. Cursor and Devin are backup-only providers until their native stores are safe to mutate.

## Consequences

Normal tests use synthetic fixtures. Real local proof is opt-in through `pnpm evidence:local`. Real pack/unpack runs are opt-in through `agent-session-pack pack --all-providers --apply` and `agent-session-pack unpack --all-providers --apply`.
