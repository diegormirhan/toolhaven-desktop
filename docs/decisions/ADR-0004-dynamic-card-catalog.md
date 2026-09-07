# ADR-0004: Dynamic cards as the tool entry point

- Status: accepted
- Date: 2026-09-05

## Context

The product holds many tools in different states of availability. The owner asked for
dynamic cards, taking Netflix's discovery and Fortnite's tiles as behavioural
references, with interaction guided by Apple's design principles.

## Decision

Every tool gets one stable card that carries discovery, installation, progress, updates
and opening. The home screen uses themed rails and a controlled set of card sizes.
Personal ordering is deterministic — pinned first, then recent use. No AI ranks anything.

## Consequences

- The user understands the catalog before learning any CLI's name.
- On-demand installation belongs to the main flow, not to a separate technical screen.
- Cards require a single state machine shared with the backend.
- Motion has to be immediate, spatially consistent, interruptible and accessible.
- The references define interaction and composition, never brand or palette.
