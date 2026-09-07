# Progress

> Newest first. Older entries are kept as a record; when a later decision supersedes one,
> the entry says so itself.

## Current increment — the interface speaks English, and a README to match

Status: finished on 2026-09-07.

The app is English end to end: catalog copy, panel labels, queue and history states, the
settings screen, and every message the Rust host returns. `index.html` declares
`lang="en"`, and the search normaliser no longer folds accents through a pt-BR collation.

Tool ids, operation ids and the manifest were untouched, so nothing about the execution
contract moved — only the words a user reads. The tests assert the English strings rather
than being loosened to ignore them. The documentation under `docs/` followed.

### Screenshots that can be regenerated

`scripts/screenshots.mjs` drives headless Chrome over the DevTools protocol to produce
every image in the README. It captures the page and nothing else, and re-running it
reproduces the whole set. A screenshot nobody can regenerate quietly starts lying after
the next change to the interface.

The theme is set through `localStorage` before the document runs, so the switch shows the
segment that is actually active instead of sitting on "System".

Worth recording as a mistake: the first attempt captured the screen with the app in the
foreground, and twice grabbed unrelated windows instead, because Windows refuses to raise
a window from a background process. Both images were deleted. Capturing the page rather
than the screen is both safer and reproducible.

### One command from a clean checkout

`setup.ps1` checks the toolchain, installs the npm dependencies, downloads and verifies
the nine pinned artifacts, runs every check, and builds the installer. Each step checks
whether its work is already done, so re-running it is safe; a full pass takes about a
minute and a half.

Nothing is installed on the machine unless asked. A missing prerequisite is reported with
the exact winget command that fixes it, and `-InstallPrerequisites` is what runs those.

Two things the script surfaced:

- **Under `$ErrorActionPreference = 'Stop'`, PowerShell 5.1 turns every stderr line from a
  native command into a terminating error.** Both `cargo test` and `tauri build` write
  progress to stderr, so the build failed on its own informational output. Native calls
  now run with the preference relaxed and are judged by their exit code.
- **`cargo` warned that `ManifestTool::version` was never read outside tests.** It now goes
  into the install progress message, so a download says which version it is fetching.

### Evidence

- 22 domain tests, 53 interface tests and 21 host tests passing.
- The contract sweep still prints "Every catalog operation passed against a real binary".
- `setup.ps1` runs to exit code 0 in 1:44, producing a 15.6 MB NSIS installer and a
  21.8 MB MSI.

## Increment — the app installs its own components

Status: finished on 2026-09-07.

The other half of hybrid delivery. Nine tools that do not fit in the installer are now
downloaded, verified and activated by ToolHaven itself: FFmpeg, ffprobe, yt-dlp, Deno,
qpdf, libvips, Poppler, Pandoc and Difftastic.

### The model

- The manifest gained a third state, `downloadable`: an artifact pinned by version and
  SHA-256, but outside the installer. `planned` still means "identity only". Schema at
  version 2, with the validator and the fixtures following.
- An artifact can declare `binaryDirectory`, the path to the executables inside the
  package — `qpdf-12.4.1-msvc64/bin`, `poppler-26.07.0/Library/bin`, and so on.
- `apps/desktop/src-tauri/src/components.rs` compiles `tools.json` in with `include_str!`.
  The build, the catalog and the runtime read one source of truth.

### Installation

- Download with real progress (one event per percentage point), SHA-256 checked before
  anything touches the final location, extraction into `.staging` on the same volume, and
  activation by `rename` — atomic. A failure at any stage leaves no half-installed
  component live.
- The directory is named after the artifact's digest. Reinstalling the same version is a
  no-op, and tools that share a package occupy one copy: ffmpeg and ffprobe come from the
  same 140 MB build and are downloaded once.
- It installs into `%LOCALAPPDATA%\ToolHaven\components`, so it **never asks for
  administrator rights**.
- The plan resolves dependencies first and skips whatever the installer already carries.
  Asking for yt-dlp installs Deno, FFmpeg, ffprobe and yt-dlp, in that order.
- Executable resolution now consults, in order: what came in the installer, the component
  store, then PATH.

### Interface

The install dialog stopped being a read-only plan. It shows the plan with per-dependency
progress, has a "Download and install" button, surfaces the error when it fails and offers
"Try again". For the four tools that still have no pinned artifact it offers no button at
all, and explains why it cannot install them.

### What is left

7-Zip, MKVToolNix, ImageMagick and ExifTool still depend on being installed beforehand.
None of them is a licensing block: it is distribution format — `.7z` and NSIS installers,
which the extractor does not read, and the absence of a stable versioned URL. Per-tool
detail in `docs/TOOL-MATRIX.md`.

### Evidence

- 22 domain tests, 53 interface tests and 21 host tests passing.
- A real integration test: it downloads Difftastic from the internet, checks the hash,
  extracts, activates, confirms `difft.exe` is in place, and proves that reinstalling does
  not download again.
- The contract sweep continued with "Every catalog operation passed against a real binary".
- NSIS installer at 15.6 MB.

## Increment — nine tools started shipping in the installer

Status: finished on 2026-09-07.

Until this point the app **only detected** tools already installed on Windows. On a clean
machine every card would say "Not installed" and nothing would work — the tools used in
the tests had been installed externally, with winget. That was fixed for nine of them and
recorded openly for the other thirteen.

### The acquisition pipeline

- `tooling/tools.json` stopped being identity alone: nine tools became `bundled`, with a
  **pinned version and SHA-256** pointing at the exact upstream release artifact.
- `scripts/tools/stage-embedded-tools.mjs` downloads each artifact into a cache, checks the
  hash — **a mismatch aborts the build**, because an artifact that does not match the
  digest is not the artifact anyone reviewed — extracts the executable and stages it in
  `resources/tools/`.
- `bundle.resources` in `tauri.conf.json` carries that directory into the MSI and the NSIS
  bundle. `npm run build` stages before Vite runs, so the installer never leaves without
  the tools.
- The script also emits `THIRD-PARTY-NOTICES.txt` and `tool-inventory.json` with name,
  version, licence, origin, artifact URL and hash.

### Resolution started preferring what we distribute

`resolve_executable` looks first in `<executable directory>/tools`. The version that was
pinned, verified and tested beats anything on the machine's PATH — the rule
`ARCHITECTURE.md` already stated and no tool had followed yet. There is a test: a binary
planted in that directory beats a name that exists on the system PATH.

### What went in, and why

| | |
|---|---|
| Included | jq, yq, ripgrep, fd, Miller, tokei, hexyl, Dust, Oxipng |
| Size | ~47 MB of executables, a **14.9 MB** NSIS installer |
| Licences | all permissive: MIT, Apache-2.0, BSD-2, Unlicense |

The criteria were a single executable, no DLLs, a permissive licence and a small size. No
copyleft tool went into the installer — the conservative position `LICENSING.md`
recommends for a first version.

Two deliberate exclusions:

- **Difftastic (112 MB)** is permissive and would qualify on licence, but on its own it
  would multiply the installer eightfold. It goes to the on-demand channel.
- **tokei** was included at version 12.1.2, from January 2021, because upstream **stopped
  publishing Windows binaries** — the current v15.0.0 tag has no artifacts at all. Keeping
  an old binary is bad; leaving a permanently dead card is worse. It is recorded here for
  review, and the alternative is building from source in the build.

### What was still missing

The other thirteen tools still depended on an external installation. The on-demand channel
— download, verify, install and activate inside the app — did not exist yet: only the Node
contracts in `scripts/component-installation/`. Meanwhile the host's error message said
exactly that, instead of implying the user should sort it out.

### Evidence

- 22 domain tests, 50 interface tests and 15 host tests passing.
- Manifest validated with 22 tools, 9 `bundled` with a pinned hash.
- `7z l` on the NSIS installer confirms `tools\*.exe` beside `toolhaven.exe`.
- NSIS installer 14.9 MB; MSI 20.9 MB.

## Increment — five dev tools

Status: finished on 2026-09-07.

The dev tools rail had seven cards and nothing tabular, nothing for bytes, nothing for
comparison. Five new tools close those gaps — researched, validated by licence and origin,
installed through winget and verified by the contract sweep.

| Tool | Operations | Licence |
|---|---|---|
| Miller | CSV to JSON, JSON to CSV, summarise columns | `BSD-2-Clause` |
| Difftastic | compare two files by syntax | `MIT` |
| tokei | count code per language | `MIT OR Apache-2.0` |
| hexyl | hex preview | `MIT OR Apache-2.0` |
| Dust | largest folders on disk | `Apache-2.0` |

### Decisions

- **All of them are read-only.** They write to stdout and nothing to disk, so they have no
  destination and no chance of overwriting a file. The same shape as jq and ripgrep.
- **The first operation with two input files.** Difftastic forced the panel to learn
  multiple selection outside qpdf's `merge`, and the host to refuse before starting the
  process when the second file is missing.
- **The first time "folder" stopped being a hardcoded exception.** `folderTools` and
  `multiInputOperations` replaced comparisons scattered across `fd` and `ripgrep`.
- **tokei does not expose JSON.** The prebuilt binary ships without the serialisation
  formats, so the adapter uses the table output instead of promising `--output json`.

### One rejection worth recording

**hyperfine** has a permissive licence and would be useful, but it times **arbitrary shell
commands** given by the user. Integrating it would mean offering arbitrary shell execution
through the interface — exactly what ADR-0002 and the security model forbid. It is the
first rejection on architectural grounds rather than licensing or product.

### Evidence

- 22 domain tests, 50 interface tests and 15 host tests passing.
- Contract sweep: "Every catalog operation passed against a real binary", covering all 22
  tools in the manifest with none skipped.
- Capability audit of 43 passing; strict TypeScript and the Windows build passing.

## Increment — five tools integrated

Status: finished on 2026-09-07.

The five validated candidates stopped being manifest entries and started working: a card,
a Rust adapter with typed argv, options in the panel, their own output naming, and a
contract test.

| Tool | Operations | Executable |
|---|---|---|
| ExifTool | read metadata, strip metadata, set title | `exiftool.exe` |
| Poppler | extract text, page as image | `pdftotext.exe`, `pdftoppm.exe` |
| Oxipng | lossless PNG optimisation | `oxipng.exe` |
| MKVToolNix | convert to MKV, inspect tracks | `mkvmerge.exe` |
| ImageMagick | convert format, convert to grey, inspect | `magick.exe` |

### Decisions the integration forced

- **A tool can have more than one executable.** Poppler and MKVToolNix split their work
  across different binaries, so `operation_executable` appeared: it resolves the executable
  per operation and falls back to the tool's representative one.
- **Xpdf is not Poppler.** The `pdftotext.exe` that appears on PATH via Git for Windows is
  Xpdf 4.06, a different project. Poppler detection goes through `pdftoppm.exe`, which Xpdf
  does not ship — otherwise the app would report Poppler as installed when it is not. There
  is a test for it.
- **Never call `convert.exe`.** The `convert` on Windows PATH is Microsoft's filesystem
  converter, not ImageMagick. The adapter uses only `magick.exe`, and a test locks that in.
- **ExifTool edits into a copy.** Every write operation uses `-o`, never
  `-overwrite_original`, to keep the rule of never touching the original.
- **`pdftoppm --singlefile` appends the extension itself**, so it receives the destination
  without one; `rasterize_prefix` handles that.
- **Option validation became a pure function.** `validate_options` moved out of
  `validate_request` because the range tests (DPI, oxipng level, empty title) were passing
  for the wrong reason — the missing-file check fired first.

### The contract test became honest about what it did not verify

The sweep against real binaries stopped being all-or-nothing: it verifies each installed
tool and **names the ones it could not verify** rather than passing quietly.

With Oxipng, Poppler and MKVToolNix installed through winget, the sweep covered all 17
tools and printed "Every catalog operation passed against a real binary".

Installing them exposed two resolution problems that only appear on real Windows:

- **The MKVToolNix installer does not touch PATH.** `%ProgramFiles%\MKVToolNix` became a
  directory the host knows.
- **With Poppler installed, Git's `pdftotext.exe` (Xpdf) still comes first on PATH.**
  Probing through `pdftoppm.exe` avoided reporting an absent Poppler as present, but did
  not stop the wrong binary from being called. Every Poppler command now resolves inside
  the directory of the installation the probe identified — which is also the long-standing
  rule in `ARCHITECTURE.md`: resolve from the installation directory, never from PATH.

### Evidence

- 22 domain tests, 46 interface tests and 15 host tests passing; the real sweep covered all
  17 tools with none skipped.
- Manifest with 17 tools validated; the audit now covers 37 capabilities.
- Strict TypeScript, the Vite build and `npm run tauri:build` passing.

## Increment — rail scrolling and newly validated candidates

Status: finished on 2026-09-07.

### The sideways rail animation

- **Root cause of the stutter:** the "can this scroll sideways?" measurement ran on every
  animation frame and every pointer move, creating a new state object and re-rendering the
  whole rail — every card in it — sixty times a second. It now publishes only when the
  value actually changes.
- Native snapping (`scroll-snap-type`) fought the spring we drive ourselves, producing a
  jolt at the end of the movement. It is suspended while the rail is under drag or
  animation, and restored afterwards.
- The spring's internal position was not clamped, but the scroller clamps: the two diverged
  and the animation jumped when it settled. The spring is now clamped alongside it and
  zeroes its velocity at the edge.
- Cards passing under the cursor fired their hover transition, one by one, during the
  scroll. Hover and transitions are disabled while the rail moves.

### Tools researched and validated

- Five candidates entered `tooling/tools.json` as `planned`, with licence, origin and
  Windows build checked at the upstream source: ExifTool, Poppler, Oxipng, MKVToolNix and
  ImageMagick. A manifest entry is validated identity, not integration: none had a card, an
  adapter or an operation, because those require a contract and a fixture.
- Three were rejected with the reason recorded: Ghostscript (AGPL-3.0 with active
  enforcement by Artifex, incompatible with an MIT app that installs the component),
  Tesseract (LSTM engine, against the no-AI rule) and pngquant (GPL-3.0 with an explicit
  commercial licence for non-GPL use — the ambiguity `LICENSING.md` says to avoid).
- Detail, caveats and sources in `docs/TOOL-MATRIX.md`.

### Evidence

- 22 domain tests, 38 interface tests and 11 host tests passing.
- Manifest validated with 17 tools; capability audit of 27 passing.
- Strict TypeScript and the Vite build passing.

## Increment — ToolHaven: identity, card artwork and real progress

Status: finished on 2026-09-06.

### Name and brand

- The product became **ToolHaven**, aligned with the repository
  `github.com/diegormirhan/toolhaven-desktop`. The previous name (Workbench) and the slug
  `unified-toolkit-desktop` left the code, the installers, the npm package, the Rust crate
  and the documentation. The Tauri identifier became `com.toolhaven.desktop` and the
  executable `toolhaven.exe`.
- A new icon: a geometric monogram — an arch in action blue over an amber base, on the
  palette's graphite. It reads as shelter over a bench, with no letterform. The source is
  `apps/desktop/src-tauri/icons/toolhaven.svg`; the rasters come from `npx tauri icon`. The
  sidebar mark repeats the same geometry, so the taskbar and the app agree. Brand colours
  are fixed tokens and do not follow the theme.
- The local directory is still `unified-toolkit-desktop`; only a fresh clone is born with
  the repository's name.

### Card artwork

- Every integration got its own drawing on a shared 200 × 100 grid, with the same stroke
  weights and the card's accent as `currentColor`, over a dotted field tinted by that
  accent. They are diagrams of what the tool produces — stacked pages, a crop frame, a
  filmstrip becoming a waveform — instead of a generic icon in an empty box.
- The truncated three-letter code (`YT-`, `FFM`, `FFP`), which looked like a defect, became
  the integration's full name.
- The availability badge left the metadata row and moved onto the artwork, removing the
  repetition of the tool's name inside the card.
- The accents stopped being called `orange`/`blue`/`stone`: the names now describe the role
  (`action`, `cool`, `amber`, `neutral`), because `orange` already rendered blue.

### Background progress that actually works

- **Root cause:** the host read yt-dlp's *stderr* looking for progress, but yt-dlp writes
  `[download] … %` to *stdout*. No progress event ever arrived and the queue sat at 0%. The
  stdout is now read line by line and the stderr is drained on a thread — the inverse of
  what it was, and with no risk of filling the pipe.
- Video downloads stopped using `--recode-video mp4`, which re-encoded the whole file even
  when unnecessary and made the job look stuck. Format selection now prefers compatible
  tracks and uses `--merge-output-format mp4`: it merges without re-encoding on the common
  path.
- New messages for the post-download phases: `[Merger]` and `[VideoRemuxer]` became
  "Merging video and audio…" and "Adjusting the container…".
- A job starts with progress `null`, not `0`. Until the tool reports a percentage the bar
  is indeterminate and the label just says "Running" — the product does not invent a number.
- The queue row started showing the host's live message, not only the final one.

### Card position and rail physics

- **Root cause of "the card is stuck to the corner":** `scroll-snap-align: start` aligns the
  card to the scrollport edge, ignoring the 32 px gutter. An overflowing rail was born with
  `scrollLeft = 32` and the card sat offset from its heading. Fixed with
  `scroll-padding-inline` on the rail; heading and card now share the same margin at any
  scroll position.
- Momentum now picks the card edge nearest the projected point instead of stopping wherever
  inertia runs out. A flick never parks a card half off the window again.
- Rubber-banding at both ends, Apple's deceleration projection, and the release velocity
  handed to a critically damped spring.
- Arrows disappear when the rail does not overflow, and disable at each end.
- If the window has its animation frames suspended, the scroll jumps to the destination
  instead of leaving the control dead.

### Apple Design applied

- Critically damped springs (response 0.3–0.4 s) instead of fixed durations; bounce only
  after a gesture that carried momentum.
- The panel leaves along the path it arrived on, materialising and dissolving with blur and
  scale rather than a flat fade.
- Scroll edge: the top bar only gains a boundary when there is content under it.
- A modal dims the background; the parallel panel only separates from it. No light
  translucent surface stacked on another — which was happening in the light theme and
  destroyed the legibility of the install plan.
- Size-specific tracking, and hierarchy from weight, size and leading together.
- Switching theme suspends transitions for one frame, because surfaces with different
  timings tore the image mid-swap.

### Evidence

- 22 domain tests, 38 interface tests and 11 host tests passing.
- Strict TypeScript, the Vite build, the manifest and the capability audit of 27 passing.
- `npm run tauri:build` produced `toolhaven.exe`, the MSI and the NSIS bundle.
- Alignment verified in the preview: heading and card at 244 px across all three rails, and
  the "next" arrow stopping at 612 px — exactly one card edge.
- Icon checked at 256, 96, 64, 48, 32 and 16 px, light and dark.

## Increment — background queue, theme and UI fixes

Status: finished on 2026-09-06.

### The queue and its progress stopped dying with the panel

- Execution left `ToolPanel` for an application-level runner
  (`apps/desktop/src/hooks/useOperationRunner.ts`) over the session queue
  (`apps/desktop/src/domain/job-queue.ts`).
- The host receives a `jobId` per operation and returns it on every `operation-progress`
  event, so progress addresses one queue entry rather than a `toolId + operationId` pair.
- The progress listener lives at the app level. Closing the tool does not cancel, hide or
  lose the job: it stays in the Queue with its real progress.
- The Queue lists running operations; the History lists finished **and** failed ones, with
  the message the host returned and the output path produced.
- The "Queue" navigation item shows how many operations are running.
- The panel became a mirror of the queue: it holds no execution state of its own and
  re-displays the progress of the job it started.

Honest limit: cancellation is still not implemented, and the queue is per session — a
restart loses the list.

### Light theme and the switch

- Complete colour tokens for light and dark in `apps/desktop/src/styles/app.css`. No rule
  below the token blocks uses a literal colour.
- A `system | light | dark` preference, persisted in `localStorage` and applied as
  `data-theme` plus `color-scheme` on the root element.
- `@media (prefers-color-scheme: light)` covers the gap before React mounts, so a Windows
  set to light never flashes dark.
- The control appears in the top bar and, with labels, in Settings.

### UI/UX fixes

- Settings stopped being a placeholder: it carries the theme control and an explicit list
  of what does not exist yet, instead of a generic sentence.
- On the native host, choosing files uses a button that opens the Windows dialog. The
  `input type="file"` is used only in the web preview, because in the WebView it returns
  the file name alone, never a usable path.
- Progress bars now declare `aria-valuemin`/`aria-valuemax`; the panel and the queue rows
  expose `role="progressbar"` with a label.
- The side panel gained a clickable scrim, with the same effect as `Escape`.
- `.placeholder-view__line` was an inline `span` inside a block header and collapsed to
  zero height; it is now declared as a block.
- The duplicated text between the header and the empty state of the Queue and History was
  separated.
- The block of overrides accumulated at the end of the CSS was dissolved into the real rules.
- A result with a produced file shows the path and lets you copy it.
- Drag and drop started working for real. The dashed area on the home screen had promised
  it from the start and only opened a picker; the app now listens to the WebView's
  drag-drop event, highlights the target while a file is over the window, and delivers the
  real path. With a tool open, the dropped file goes straight into it.

### Evidence

- 22 domain tests (Node), 36 interface tests (Vitest) and 10 host tests passing.
- `cargo test -- --include-ignored`: all 28 catalog operations ran against the real tools
  installed on Windows.
- Strict TypeScript with no errors; the Vite build passing.
- `npm run validate:tools` and `npm run audit:capabilities` (27 capabilities) passing.
- `npm run tauri:build` produced the executable, the MSI and the NSIS bundle for Windows x64.
- Visual acceptance of both themes at 1440 × 900 and 375 × 812.

## Increment — first icon and execution fixes

Status: finished on 2026-09-06.

- yt-dlp downloads started using the `web_embedded` client, avoiding the HTTP 403 the
  default client returned.
- libvips upscaling uses Lanczos3 and rejects factors at or below 1×.
- The application icon was redone in graphite, pale blue and amber, and the same mark is
  used in the sidebar.

## Increment — real native execution

Status: finished on 2026-09-05.

- The Tauri host exposes only `execute_operation` and `detect_available_tools`; no
  arbitrary shell comes from the interface.
- Rust adapters run FFmpeg/ffprobe, yt-dlp/Deno, qpdf, libvips, jq, yq, ripgrep, fd, 7-Zip
  and Pandoc through argument arrays.
- The panel uses the native Windows dialogs to select inputs and destinations, and shows
  stdout, errors and the produced output.
- Card availability is detected on the host; the queue records a completion only after the
  real process returns success.
- The web preview runs no operation and says to open the Windows application.
- Missing components are not simulated: the dialog shows the dependency plan until
  versioned artifacts and hashes are published.

Evidence at that checkpoint: 22 domain tests, 14 interface tests, 3 host tests, strict
TypeScript, the manifest and the capability audit of 27 passing; a Tauri Windows x64 build
produced.

## Windows x64 bootstrap — native Tauri

Status: finished on 2026-09-05.

- Rust/MSVC installed with the `stable-x86_64-pc-windows-msvc` toolchain (`rustc 1.98.1`).
- Visual Studio Build Tools 2022 and Windows SDK 10.0.26100.0 available.
- A Tauri 2 host generated in `apps/desktop/src-tauri` with its own identifier and the MIT
  licence.
- `cargo check` passing for the native host.
- `npm run tauri:build` passing for the Windows x64 target.
- Installers produced: MSI and NSIS, plus the release executable.
- The catalog audit covers 27 capabilities, including the initial dev tools.

Public distribution remained conditional on versioned artifacts and pinned hashes.

## Increment — queue and execution plans

Status: finished on 2026-09-05.

- The operation queue had the states `queued`, `running` and `succeeded`; progress was
  illustrative at that checkpoint.
- History started listing operations finished during the session.
- The resolver `scripts/execution/resolve-operation-plan.mjs` translates FFmpeg, ffprobe
  and qpdf into execution plans of `executable + args`, with no arbitrary shell.
- Conversion, audio extraction, compression, trimming, inspection and the PDF operations
  got an initial contract.
- The panel exposes contextual options: CRF, start and end, pages, rotation and PDF
  password.

Evidence: 21 domain tests + 16 interface tests passing; TypeScript and the Vite build
passing.

**Superseded:** the queue states described above were replaced by
`running | succeeded | failed` in the 2026-09-06 increment.

## Increment — operations and palette

Status: finished on 2026-09-05.

- Cards started exposing concrete operations per tool (PDF, image, media and inspection).
- The panel lets you choose the operation and, for yt-dlp, provide a media URL.
- At that checkpoint execution was still illustrative, with an explicit job state and no
  real binaries called.
- The palette dropped green.

**Superseded:** the palette described at this checkpoint (mineral blue `#7f9bb7` with
orange for actions) no longer holds. The source of truth is `DESIGN.md`: action in blue
`#88afff`, positive state in pale blue `#a8bfff`, amber for attention and clay for errors,
with contrast-matched equivalents in the light theme.

Evidence: 18 domain tests + 15 interface tests passing; TypeScript, the Vite build and the
manifest validated.

## Parts 4 and 5 — visual system and a runnable catalog

Status: finished on 2026-09-05.

### Part 4: visual system and shell

- The "modular post-production bench" direction recorded in `DESIGN.md`.
- A responsive shell with navigation for tools, queue, history and settings.
- Global search by name, action, capability and extension.
- A file entry area and useful empty states, with no invented data.
- A visual vocabulary native to Windows, with immediate feedback and reduced motion.

### Part 5: catalog and tool flow

- Variable cards organised into deterministic rails, with files, images and documents
  grouped to preserve density.
- Included, available, downloading and ready states reflected in the card itself.
- A real dependency plan from the domain, ahead of the installer integration.
- The cancellation contract and the transition to the ready state, kept in the domain.
- A side panel to open a tool without switching context.
- The layout swaps horizontal rails for a vertical grid in a narrow window.

### Evidence

- 18 domain tests and 8 interface tests passing.
- TypeScript in strict mode with no errors.
- The Vite production build passing.
- The tool manifest passing.
- Visual acceptance at 1440 × 900 and 390 × 844.
- The yt-dlp flow validated in the browser with Deno, FFmpeg, ffprobe and yt-dlp.
- At that checkpoint no real download, binary execution or external write had been enabled.

## Parts 2 and 3 — on-demand installation

Status: finished on 2026-09-05.

### Part 2: the installation resolver

- Resolves transitive dependencies ahead of the requested tool.
- Removes duplicates when tools share dependencies.
- Ignores embedded components and versions already installed.
- Detects cycles and shows the full path.
- Rejects tools requested outside the catalog.
- A real plan validated for yt-dlp: Deno, FFmpeg, ffprobe and yt-dlp.

### Part 3: states, cancellation and rollback

- Immutable state, with availability separated from the transient operation.
- The covered flow: resolve, download, verify, install and activate.
- Cancelling preserves the active version.
- A failed update rolls back logically to the previous version.
- A failed first installation returns to the available state with a diagnosable error.
- Invalid transitions and progress outside `0..1` are rejected.

### Evidence

- 18 tests passing.
- Total coverage: 83.17% of lines; the new modules above 90%.
- The real manifest validated after the changes.
- No download, global installation or real filesystem work was implemented.

The Node modules were temporary executable contracts. The final runtime became Rust once
the toolchain was explicitly authorised.

## Part 1 — the tool catalog contract

Status: finished on 2026-09-05.

### Delivered

- A real manifest, `tooling/tools.json`, for Windows x64.
- Planned entries for FFmpeg, ffprobe, yt-dlp, Deno, qpdf and libvips.
- A versioned JSON Schema for editor support and format documentation.
- A pure validator with no external dependencies.
- A CLI to validate the manifest the build uses.
- Rules preventing duplicate ids, non-HTTPS downloads, invalid hashes, unsafe destinations
  and tools marked as bundled without pinned artifacts.
- A mandatory `embedded` or `on-demand` strategy per tool.
- Transitive dependencies validated against the catalog.
- The visual catalog contract in `CARD-CATALOG.md` and ADR-0004.

### Evidence

- At the close of Part 1, 8 catalog contract tests passing.
- `npm run validate:tools`: manifest passing.
- `node --check`: scripts passing.
- The JSON Schema read successfully.

## Proposed next step

Cancelling a running operation is the most visible hole left in the queue, and it needs
Windows Job Objects plus a per-operation cleanup rule. After that: persisting the queue and
the history across restarts, and signing the installer so SmartScreen stops warning.

The four tools without a pinned artifact — 7-Zip, MKVToolNix, ImageMagick, ExifTool — need
either `.7z` and NSIS support in the component installer, or a repackaging channel of our
own.
