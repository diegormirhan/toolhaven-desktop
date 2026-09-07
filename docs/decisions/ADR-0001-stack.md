# ADR-0001: Tauri, Rust and React

- Status: accepted
- Date: 2026-09-04

## Context

The product is Windows-first, processes files locally, and has to distribute existing
CLIs and libraries behind a rich interface. The owner chose Tauri as the builder and
delegated the rest of the stack.

## Decision

Use Tauri 2, Rust on the host, and React + TypeScript + Vite on the frontend. SQLite is
the recommended local persistence.

## Consequences

- Reuses the author's existing experience with React and TypeScript.
- Rust suits processes, the filesystem, concurrency and typed contracts.
- The WebView keeps the shell small, but the total bundle stays dominated by the
  third-party binaries.
- More than one language raises the discipline the IPC contracts demand.
- The owner confirmed the delegated stack and Windows x64 as the first platform.
