# UX foundation

## Status

A provisional foundation, not `DESIGN.md`. The visual system that shipped is documented
there; this file records the navigation model and the required states that shaped it.

## Provisional design read

```yaml
artifact: Windows desktop utility
audience: power users, creators and developers who want common file jobs without CLI setup
visual-language: precise native-feeling bench, calm rather than decorative
mode: greenfield / operate
visual-variance: 4/10
motion-intensity: 3/10
information-density: 7/10
asset-dependence: 2/10
brand-fidelity: 1/10 (brand not defined)
```

## Navigation model

- **Discover:** a visual catalog of tools in cards and dynamic rails.
- **Workbench:** the open tool, its drop zone, its operation and its options.
- **Queue:** running jobs, progress, cancellation and order.
- **History:** results, open the folder, repeat, inspect the logs.
- **Settings:** destinations, conflicts, concurrency, updates and privacy.

Categories must not become an enormous sidebar. The catalog borrows Netflix's rail
discovery and Fortnite's tile presence as behavioural references, not as visual copies.
Searching by action and by extension answers "I have this file, what can I do with it?".
Pinned and recent items are ordered deterministically, with no AI.

## The main flow

1. Choose a card, or drop a file onto the global area.
2. If the tool is not installed, the card itself shows the size, the dependencies and the
   action to download it.
3. After installation the card keeps its position, and its action becomes "Open".
4. The app identifies the type and shows the valid actions.
5. The user picks a task and a preset; advanced options stay collapsed.
6. Running adds it to the queue without blocking the window.
7. Completion offers to open the file, open the folder, repeat, or undo where possible.

## Required states

- a useful empty state, with real example actions;
- an incompatible file;
- an experimental combination;
- a name conflict;
- not enough disk space;
- running, pausable where supported, and cancellable;
- finalising, without promising instant cancellation;
- finished, warning, recoverable failure and technical failure;
- a missing or corrupted binary caught by the health check;
- a card that is available, resolving dependencies, downloading, verifying, installing,
  ready, has an update, or failed recoverably.

## Behaviour and motion

- Feedback on pointer-down, and immediate visual latency on the primary actions.
- A focused card lifts in an overlay without pushing the grid; keyboard and pointer keep
  the same mental position.
- Critically damped springs (`damping 1.0`, `response 0.3–0.4`) for focus and opening;
  bounce only after a drag with momentum.
- Draggable rails follow the pointer 1:1, inherit its velocity, and resist softly at the
  limits.
- Continuous progress; never invent a percentage the tool does not report.
- Short, interruptible transitions; no bounce in menus or progress.
- Entry and exit along the same spatial path.
- Reduced motion preserves the feedback as a cross-fade.
- Controls sit near the result they affect, with specific labels.

## Windows desktop

- Prioritise the keyboard, drag and drop, context menus and discoverable shortcuts.
- Comfortable targets without looking like an inflated mobile interface.
- Respect the theme, text scaling, high contrast and focus navigation.
- Do not imitate macOS; apply the principles of clarity, response and agency to the
  vocabulary Windows users expect.

## The checkpoint, in hindsight

This file ended with a pending checkpoint on direction, brand, density and language. All
four are now settled and recorded: the direction and palette in `DESIGN.md`, the name and
the English interface in `QUESTIONS.md`. The functional contract for the cards lives in
`CARD-CATALOG.md`.
