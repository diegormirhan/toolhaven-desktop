# ADR-0003: Hybrid delivery for the toolchain

- Status: accepted
- Date: 2026-09-04
- Confirmed by the owner: 2026-09-07

## Context

The central requirement is that installing once is enough, and that the user never
fetches a dependency by hand. Keeping executables in the repository by hand guarantees
neither origin, nor licence, nor repeatability. Bundling all of them produces an
installer near a gigabyte.

## Decision

A manifest pins the delivery strategy, version, URL, hash, licence, dependencies and
expected files for every tool. Light tools ship inside the installer. Heavy ones are
published as on-demand packages and installed by the app itself: download, staging,
verification, health check, atomic activation.

## Consequences

- The user gets the core immediately and chooses which heavy packages to install.
- The repository stays auditable and avoids opaque blobs as a source of truth.
- The app takes on responsibility for downloading, resuming, integrity, disk space and
  rollback.
- The installer does not grow with every integration that exists.
- yt-dlp appears in the first version, installed on demand together with its dependencies.
- Light and heavy tools share the same card language. Installation state changes the
  action, never the tool's place in the catalog.
