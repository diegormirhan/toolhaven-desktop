# Visual system

## Direction

**Modular post-production bench.** The app borrows the rhythm of media bins,
equipment cases and contact sheets: stable rails, large capability tiles and precise
status labels. It does not reproduce Netflix or Fortnite branding.

The interface is an operational Windows surface. The catalog creates discovery and
presence; once a tool opens, the interface becomes denser and quieter.

## Design read

```yaml
artifact: Windows desktop application shell and tool catalog
audience: creators, developers and power users working with local files
visual-language: modular post-production bench
mode: greenfield / operate
visual-variance: 5/10
motion-intensity: 4/10
information-density: 7/10
asset-dependence: 2/10
brand-fidelity: 1/10
```

The stable sidebar and row grid absorb the high density. Visual variance is spent on
tile proportion and a single featured file picker. Motion is limited to direct input,
rail movement and state transitions. No product imagery or invented brand is needed.

## Positioning

- Narrative role: enter a task quickly and understand component availability.
- Viewing distance: Windows laptop or desktop at arm's length.
- Temperature: focused, tactile and calm, with energy only on actionable controls.
- Capacity: five primary destinations and three to six tools per row at 1280–1600 px.

## Tokens

- Ground: neutral slate `#15171c`; raised surface `#1d2027`; tile surface `#252933`.
- Text: cool white `#f3f5fa`; secondary `#b8c1d0`; quiet `#a3aec0`.
- Action: blue `#88afff`, reserved for actions and active progress.
- Positive state: pale blue `#a8bfff`; warning: amber `#d8a64f`; error: clay `#dd6b64`.
- No green or olive surfaces, including hardcoded backgrounds and translucent materials.
- Typeface: Segoe UI Variable / Segoe UI, intentionally native to Windows.
- Spacing: 4 px base, primarily 8 / 12 / 16 / 24 / 32.
- Radius: 8 px controls, 14 px tiles, 18 px large workspace surfaces.
- Depth: one border or one offset shadow; never both on the same tile.
- Motion: critically damped, 160–240 ms for UI state; 320 ms for spatial card detail.

## Interaction grammar

- Pointer-down compresses controls immediately.
- Hover and keyboard focus lift a tile without reflow.
- Rails keep partially visible cards at the right edge as an affordance.
- The detail panel opens from the selected card's side and closes the same way.
- Reduced motion replaces translation and scale with short cross-fades.
- Focus rings and labels keep every state understandable without color alone.

## Boundaries

- No marketing hero, decorative dashboards, fake metrics or generated usage history.
- No emoji or improvised icon silhouettes; use one consistent vector icon library.
- No autoplay, infinite feed or opaque recommendations.
- Product name: Workbench. Keep the wordmark legible in the expanded Windows sidebar.
