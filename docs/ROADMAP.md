# Roadmap

## Phase 0 — decisions and proof of distribution

- Answer `QUESTIONS.md`.
- Choose the name, the app licence, the supported architecture and the bundle limit.
- Spike licence and size for FFmpeg, yt-dlp + Deno, libvips and qpdf.
- Define the light core and the signed on-demand component channel.
- Put yt-dlp + Deno in the first version's catalog without putting them in the installer.
- Produce a signed empty installer, or record the SmartScreen limitation deliberately for
  a portfolio release.
- Pin the real MVP matrix.

**Output:** confirmed ADRs and an initial tool manifest, with no final interface.

## Phase 1 — the first vertical flow

- Scaffold Tauri 2 + React/TypeScript.
- Job lifecycle, temporary workspace, cancellation and events.
- FFmpeg/ffprobe: extract the audio from a video.
- Minimal history, tested on a clean VM.

**Output:** one light task works end to end from the installer.

## Phase 2 — useful media

- Video and audio conversion and compression.
- Explicit presets, with advanced options behind them.
- Fixtures for the supported codecs.
- A queue with a concurrency limit.

## Phase 3 — images and PDFs

- A spike decides libvips versus Rust for images.
- Image batches with a conflict policy.
- qpdf for the structural operations.
- PDFium only if preview and rasterisation justify the cost.

## Phase 4 — download and in-app installation

- Cards install yt-dlp + Deno and their dependencies without leaving the app.
- Resumable download, hash, staging, health check, atomic activation and rollback.
- Public URLs first; authentication stays out until the threat model and the interaction
  are defined.
- The frequent upstream changes covered by recorded contracts.

## Phase 5 — portfolio finish

- Short onboarding, empty and error states, accessibility.
- An About screen listing components and licences.
- A site or release with hashes, SBOM, screenshots and an honest demo.
- A size, time and memory benchmark with publishable fixtures.

## Phase 6 — controlled expansion

Evaluate archives, metadata, documents and developer tools one flow at a time. A category
enters only with a target user, its formats, its tool, its licence, fixtures and a bundle
budget.

## Where the roadmap actually stands

Phases 0 through 4 are done, in a different order than planned: the catalog, the job
engine, the typed adapters and both delivery channels exist and are tested against the
real binaries. What phase 1 called cancellation was never built, and phases 2 and 3
expanded well past their scope — twenty-two tools instead of the four flows.

Phase 5 is the open one: signing, the About screen, the published release, the benchmark.

## Out of the roadmap until validated

- A plugin marketplace.
- Arbitrary command execution.
- A full timeline or canvas editor.
- Cloud sync and accounts.
- AI, neural OCR and super-resolution.
