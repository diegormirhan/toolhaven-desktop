# Dynamic tool catalog

## Intent

The catalog should have the discoverability people associate with Netflix's rails and the
visual weight of Fortnite's tiles, adapted to a desktop tool. A card is not decoration:
it is the entry point, the installation status and the primary action for one tool.

## The first screen

1. **Continue where you left off:** recent jobs or recently used tools.
2. **Installed:** ready tools, pinned first.
3. **Media and downloads:** video, audio and yt-dlp.
4. **Files, images and documents:** resize, crop, compression, conversion and PDFs.
5. **Dev tools:** small utilities, preferably native and immediately open.
6. **All:** the searchable, filterable catalog.

The order is deterministic: pinned, then recent activity, then the manifest's editorial
order. There is no AI recommendation, no hidden profile, no personalised remote feed.

## Card types

- **Featured:** one highlighted capability or flow, at most one per viewport.
- **Tool:** the standard card representing one tool.
- **Compact:** a light, frequently used utility, suited to a denser rail.
- **Active job:** a transient variant with progress and an action to open the queue.

Size variation creates rhythm, but navigation uses a predictable grid. Avoid irregular
masonry, which makes keyboard use, resizing and spatial memory fragile.

## Minimum content

- The tool's direct name.
- The result it produces, in one line.
- Its availability state.
- The download size where that applies.
- One contextual primary action.
- A quiet badge for "Included", "Download" or "Update".

Licence and dependencies belong to the detail and installation views. They do not clutter
every card.

## The card state machine

```text
embedded ───────────────────────────────────────────────► open

available ► resolving ► downloading ► verifying ► installing ► ready ► open
                 │            │             │          │
                 └────────────┴─────────────┴──────────┴──► failed ► retry

ready ► update_available ► updating ► ready
```

- `embedded`: the action is "Open".
- `available`: the action is "Get it", with the size visible.
- `resolving`: dependencies and space are being worked out; a short skeleton, not a loose
  spinner.
- `downloading`: real progress, optional speed, pause and cancel where supported.
- `verifying`: honestly indeterminate; do not invent a percentage.
- `installing`: disable only the conflicting actions, never the whole interface.
- `ready`: the action becomes "Open", in the same place.
- `failed`: a short reason, "Try again", and expandable technical detail.

## Interaction and motion

- Visual response starts on pointer-down.
- Hover and focus lift and scale subtly in an overlay, without reflow.
- The expansion grows out of the card itself and returns along the same path.
- Default motion: a spring without overshoot, responding in 300–400 ms.
- Drag on a rail: 1:1 tracking, pointer capture, momentum projection, and rubber-banding
  at both ends.
- Arrow keys move between cards; Enter opens or installs; Escape closes the detail.
- A card can be interrupted and reversed mid-animation.
- `prefers-reduced-motion` replaces scale and translation with a short cross-fade.
- High contrast: a defined focus border, and no state that depends on colour alone.

## Responsive desktop layout

- Wide window: featured plus horizontal rails with cards partly visible at the edge.
- Medium window: fewer cards per rail, and a smaller featured card.
- Narrow window: a vertical grid; no mandatory horizontal scrolling.
- Density becomes configurable later, without changing hierarchy or terminology.

## Performance

- Local images and previews load lazily.
- Virtualise only large catalogs; do not pay that complexity before it is needed.
- Animate `transform` and `opacity`; never the layout of dozens of cards.
- Unmount heavy previews outside the visible area.
- Download state comes from a single source in the backend and is reflected in every card.

## Boundaries of the reference

- Do not reproduce Netflix's or Fortnite's identity, art, typography or palette.
- No video autoplay in the catalog.
- Do not turn tools into infinite content.
- Do not hide search, installation or the queue to favour visual impact.
- Do not move cards on their own while the user is browsing.
