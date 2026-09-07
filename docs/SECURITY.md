# Security model

## The threat that matters

The app takes paths, URLs and options controlled by the user and hands them to complex
programs that read untrusted formats. The critical boundary is the translation from an
interface intent into a local process.

## Mandatory rules

1. The frontend never runs a shell and never chooses an executable.
2. Arguments are built by adapters from enums and validated values.
3. Never concatenate a command line; always pass the program and its arguments separately.
4. Canonicalise input and destination; never follow an output into an unexpected directory.
5. Never overwrite the original; publish the output only after it is validated.
6. Every job gets its own temporary directory with minimal permissions.
7. URLs, cookies, headers and personal paths are redacted before logs leave the machine.
8. A binary enters the build or the component store only from an allowlisted origin, with
   a pinned hash and a smoke test.
9. Tauri capabilities stay minimal and specific per window and per command.
10. Updates require a signature; the private key does not live in the repository.

## Running binaries

- Resolve from the installation's resource directory first, then the component store,
  never from PATH alone.
- Allowlist the environment: do not inherit variables the tool does not need.
- A timeout and an output limit, so logs cannot grow without bound.
- A Windows Job Object groups the process and its children for reliable cancellation.
- The parser treats stdout and stderr as untrusted text.
- Temporary files get generated names, never raw fragments of a URL.

## What the component store enforces

- Every artifact is pinned by URL and SHA-256 in the manifest, and the digest is checked
  before anything is activated.
- Extraction rejects absolute paths and `..` inside an archive, so a hostile package
  cannot write outside the store.
- Extraction happens in a staging directory beside the target, and activation is an
  atomic rename. A failure never leaves a half-installed component live.
- Components land under `%LOCALAPPDATA%`, so no installation needs administrator rights.

## Network

By default, the file modules do not touch the network. The component installer, yt-dlp and
the updater declare it explicitly. The interface shows the size and the origin before
downloading. Telemetry is still an open product decision, and would have to be opt-in.

## Updates

Tauri requires signed updater packages. On-demand tool packs use a separate signed
catalog, pinned hashes, isolated staging and atomic activation. The app must never run a
package merely because the download finished: verification and the health check come first.

## Reporting a vulnerability

Before a public release, add a `SECURITY.md` for responsible disclosure with a contact
channel, the supported versions and a realistic SLA. This document is the internal
technical model, not the public policy.
