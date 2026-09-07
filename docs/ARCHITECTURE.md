# Architecture

## The central decision

A local modular monolith: a React interface in a WebView, a Tauri/Rust host, and a closed
catalog of tools that are either bundled or installable on demand. There is no separate
local server in the MVP.

```text
React UI
  │ typed invoke/events
  ▼
Tauri command boundary
  │ validates DTOs and paths
  ▼
Application use cases ─── Job registry/history (SQLite)
  │
  ├── Component installer ─ pinned catalog / downloads / activation
  │
  ├── Media adapter ───── ffmpeg / ffprobe
  ├── Download adapter ── yt-dlp / deno
  ├── Image adapter ───── libvips CLI or Rust image path
  └── PDF adapter ─────── qpdf / Poppler boundary
        │
        ▼
Temporary workspace → validated output → atomic publish
```

## Why this shape

- Rust keeps validation, processes and the filesystem out of the WebView.
- Use cases depend on neither Tauri nor the stdout format of any CLI.
- Adapters translate typed requests into permitted arguments.
- A single job engine handles progress, logs, cancellation and concurrency for every
  category.
- Sidecars preserve the upstream tools, so an integration can be updated without
  reimplementing a codec.

## The life of an operation

1. The interface sends a typed DTO such as `TranscodeVideoRequest`.
2. The boundary validates the schema, the paths, the permissions and any output conflict.
3. The use case creates an immutable `Job` and an exclusive temporary workspace.
4. The adapter produces an `ExecutionPlan`; it never receives a shell string.
5. The supervisor starts the known executable with an argument array.
6. The parser turns stdout and stderr into normalised domain events.
7. The interface receives progress, a warning, completion or an error.
8. On success the temporary file is validated and moved to its final destination.
9. On cancellation or failure the temporaries are cleaned and the original is untouched.

## Proposed Rust modules

- `toolkit-domain`: Job, Operation, InputFile, OutputPlan, Progress, Failure.
- `toolkit-application`: use cases and ports; knows nothing about Tauri or CLIs.
- `toolkit-runner`: the process supervisor, cancellation and concurrency limits.
- `toolkit-files`: paths, temporary workspaces and atomic publication.
- `toolkit-catalog`: the manifest, versions, hashes, licences and capabilities.
- `toolkit-adapters`: one submodule per external tool.
- `toolkit-persistence`: SQLite for jobs, presets and settings.
- `desktop-host`: Tauri commands and events, and dependency composition.

Create a crate only when there is a real boundary to protect. The scaffold can start as
modules inside `src-tauri` and extract crates as the tests prove the need.

## The contracts that matter

### Operation

A stable intent (`extract_audio`, `merge_pdf`), never the name of a CLI.

### ExecutionPlan

Holds the registered executable, separated arguments, a minimal environment, a working
directory, a progress parser and a cancellation rule. It holds no shell command.

### ToolDescriptor

The single source for id, version, target, bundle files, origin, hash, licence, notices
and capabilities.

### Job lifecycle

`queued → validating → running → finalizing → succeeded | failed | cancelled`

Invalid transitions fail loudly. Restarting the app marks interrupted processes as
`abandoned`, never as successful.

## Processes and concurrency

- A conservative global limit, and a separate limit for heavy jobs.
- Graceful cancellation first; forced termination after a timeout.
- The process tree is terminated through Windows Job Objects so no child is orphaned.
- Backpressure: added files join the queue instead of all starting at once.
- Structured logs, with URLs, cookies and sensitive paths redacted in the interface.

## Packaging

There are two delivery channels:

- **Embedded:** the core and the light tools travel in the installer as Tauri resources.
- **On-demand:** heavy packages are downloaded by the app into a component store inside
  the application data directory.

Simple embedded executables can enter as `externalBin`. Distributions with DLLs, data or
auxiliary fonts use versioned resources. On-demand components never depend on PATH: the
backend resolves the active version inside the component store.

**Implemented.** `scripts/tools/stage-embedded-tools.mjs` downloads every artifact marked
`bundled`, checks the pinned SHA-256 — a mismatch aborts the build — and stages it in
`resources/tools/`, which the Tauri bundler carries next to the executable. At runtime
`resolve_executable` looks there first: the version that was pinned, verified and tested
beats whatever the machine happens to have on PATH. The script also generates
`THIRD-PARTY-NOTICES.txt` and `tool-inventory.json`.

### On-demand installation

1. Resolve the tool and its dependencies in the pinned catalog.
2. Show the total size, version, licence and required space on the card.
3. Download into staging, resuming where the server allows it.
4. Verify the SHA-256 of every file.
5. Extract into a directory isolated per version and run a health check.
6. Activate the new version with an atomic swap.
7. Keep the previous version until the first healthy use, then allow cleanup.

The domain separates stable availability (`available` or `ready`) from the transient phase
(`idle`, `resolving`, `downloading`, `verifying`, `installing`), so an update can fail
without erasing the active version. Cancelling never leaves a partially active version.

**Implemented** in `apps/desktop/src-tauri/src/components.rs`. The host compiles
`tooling/tools.json` in with `include_str!`, so the build, the catalog and the runtime all
read one source. Each artifact installs into a directory named after its SHA-256, which
makes reinstalling idempotent and lets tools that share a package — ffmpeg and ffprobe
come from the same build — occupy a single copy. Extraction happens in a `.staging`
directory beside the final target, on the same volume, and activation is a `rename`: a
failure never leaves a half-installed component live. Executable resolution consults, in
order, what came in the installer, then the component store, and only then PATH.

The Node modules under `scripts/component-installation/` were the executable specification
while Rust was not yet authorised in the environment. They perform no I/O, and the Rust
implementation now mirrors them; they remain as cross-language acceptance cases.

The planned pipeline:

1. Read `tooling/tools.json` and validate it against the versioned contract.
2. Download the pinned upstream artifacts.
3. Verify the hash and signature, and extract into staging.
4. Run a smoke test for each executable.
5. Copy `embedded` tools into the bundle and publish `on-demand` packages to the
   component channel.
6. Generate `THIRD-PARTY-NOTICES`, an SBOM and the JSON inventory the interface consumes.
7. Build and sign the NSIS/MSI bundles and the updater manifest.

## Persistence

SQLite holds job metadata, presets and preferences. It does not hold file contents.
Detailed logs have a configurable retention. Cookie or token secrets, if authenticated
downloads are ever approved, belong in the Windows Credential Manager and never in the
database as plain text.

## Testing strategy

- **Unit:** validation, output naming, states and argument assembly.
- **Contract:** parsers against recorded stdout and stderr from pinned versions.
- **Integration:** small fixtures executed with the real binaries.
- **Packaging:** a clean VM confirms resources, licences and smoke tests.
- **Components:** interrupted download, invalid hash, rollback and transitive dependencies.
- **End to end:** one happy path and one useful error per vertical flow.

## Repository structure

```text
toolhaven-desktop/
├─ setup.ps1               # one command: toolchain, deps, tools, checks, installer
├─ .agents/skills/
├─ apps/desktop/
│  ├─ src/                 # React UI
│  └─ src-tauri/           # Tauri host and Rust composition
├─ crates/                 # extracted only when a boundary proves itself
├─ docs/
│  ├─ decisions/
│  └─ screenshots/         # generated by scripts/screenshots.mjs
├─ scripts/                # fetch, verify, notices, SBOM, package, screenshots
├─ tooling/
│  ├─ tools.json
│  └─ schemas/
├─ vendor/                 # generated; binaries are never edited by hand
└─ tests/
   ├─ contracts/
   ├─ fixtures/
   └─ packaging/
```

## Verified technical sources

- Tauri sidecars: https://v2.tauri.app/develop/sidecar/
- Tauri updater: https://v2.tauri.app/plugin/updater/
- Signing on Windows: https://v2.tauri.app/distribute/sign/windows/
