# ADR-0005: Separate stable availability from installation activity

- Status: accepted
- Date: 2026-09-05

## Context

A tool can stay usable while an update for it is downloading, or failing. A single enum
like `installing | ready | failed` loses that, and forces the card to hide a version
that is still perfectly healthy.

## Decision

Model stable availability and the transient phase separately. Resolve the plan as an
acyclic graph, order dependencies ahead of the requested tool, and drop anything already
bundled or already installed. Activation happens only after verification and
installation are complete.

## Consequences

- A failed update leaves the active version untouched.
- A card can show progress without disabling "Open" when that is safe.
- Cycles and missing dependencies fail before a single byte is downloaded.
- The Node contracts were the executable specification; `components.rs` implements the
  same shape in Rust, and the contracts remain as cross-language acceptance cases.
