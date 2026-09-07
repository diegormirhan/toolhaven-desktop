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

The dark theme below is the reference. Both themes are declared as CSS custom
properties in `apps/desktop/src/styles/app.css`; no rule beneath the token blocks may
use a literal color, because that is what keeps the two themes in sync.

- Ground: neutral slate `#15171c`; raised surface `#1d2027`; tile surface `#252933`.
- Text: cool white `#f3f5fa`; secondary `#b8c1d0`; quiet `#a3aec0`.
- Action: blue `#88afff`, reserved for actions and active progress.
- Positive state: pale blue `#a8bfff`; warning: amber `#d8a64f`; error: clay `#dd6b64`.
- No green or olive surfaces, including hardcoded backgrounds and translucent materials.

### Light theme

Same roles, re-weighted for a light ground rather than inverted mechanically. Every
pair below clears 4.5:1 against its own surface.

- Ground: `#eef1f6`; raised surface and tiles: `#ffffff`; sunken surface: `#f2f5fa`.
- Text: `#141821`; secondary `#465063`; quiet `#5b6577`.
- Action: blue `#2a55c4` with white foreground; positive state `#2f5fbf`;
  warning `#8a5a08`; error `#b4372f`.
- The theme follows Windows by default; an explicit choice is stored per machine and
  stamped as `data-theme` plus `color-scheme` on the root element.
- Typeface: Segoe UI Variable / Segoe UI, intentionally native to Windows.
- Spacing: 4 px base, primarily 8 / 12 / 16 / 24 / 32.
- Radius: 8 px controls, 14 px tiles, 18 px large workspace surfaces.
- Depth: one border or one offset shadow; never both on the same tile.
- Motion: critically damped springs, response 0.3–0.4 s. Bounce only after a gesture
  that carried momentum; never on a menu, a progress bar or a fade.
- Type tracking is size-specific: `-0.032em` on display headings, `-0.018em` on card
  titles, near zero on body, `+0.1em` on the small uppercase artwork labels.

## Brand mark

The icon is a geometric monogram: an arch in action blue over an amber base, on the
graphite ground. It reads as shelter over a bench — the product metaphor — without a
letterform. `apps/desktop/src-tauri/icons/toolhaven.svg` is the source; every raster
size is generated from it with `npx tauri icon`. The sidebar mark repeats the same
geometry so the taskbar and the app agree. Brand colours are fixed tokens
(`--brand-*`) and never follow the theme.

## Card artwork

Every integration has a drawing on a shared 200 × 100 grid, using the same stroke
weights and the card accent as `currentColor`, over a dotted field tinted by that
accent. They are diagrams of what the tool produces — stacked pages, a crop frame, a
filmstrip resolving into a waveform — not decoration and not a generic icon in a box.
A rail of twelve reads as one set. New tools add a glyph to that grid or they get the
neutral fallback; they never get a photo or a logo.

## Interaction grammar

- Pointer-down compresses controls immediately; nothing waits for the release.
- Hover and keyboard focus lift a tile without reflow.
- Rails keep partially visible cards at the right edge as an affordance.
- A rail drag tracks the pointer 1:1 after ~8 px of slack, projects the flick's resting
  point with Apple's deceleration formula, hands the release velocity to the spring,
  and rubber-bands at both ends instead of stopping dead.
- Rail arrows disappear when the row does not overflow and disable at each end.
- The detail panel opens from the selected card's side and closes along the same path,
  materialising and dissolving with blur and scale rather than a flat fade.
- A modal task dims the background; the parallel tool panel only separates from it.
  A light translucent surface is never stacked on another one.
- Sticky chrome has no permanent divider: the seam appears only once content is under it.
- Reduced motion replaces translation and scale with short cross-fades.
- Focus rings and labels keep every state understandable without color alone.

## Boundaries

- No marketing hero, decorative dashboards, fake metrics or generated usage history.
- No emoji or improvised icon silhouettes; use one consistent vector icon library.
- No autoplay, infinite feed or opaque recommendations.
- Product name: ToolHaven. Keep the wordmark legible in the expanded Windows sidebar.
