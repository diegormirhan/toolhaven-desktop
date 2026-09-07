# Product

<!-- impeccable:product-schema 1 -->

> Initial record inferred from the explicit request. Anything marked as a hypothesis or
> an open decision has not been confirmed by the product owner.

## Platform

web

The value above describes the surface rendered in a WebView, as the skill's schema
requires. What ships is a native Windows desktop application built with Tauri.

## Stack

Tauri 2 with a Rust host, React + TypeScript + Vite for the interface, SQLite locally.

## Users

Hypothesis: people on Windows who keep switching between websites, installers and CLIs
to convert, inspect or manipulate files. The author is the first user, and also wants to
show the work as a portfolio piece.

## Product Purpose

Offer a single installation for the recurring media, image, PDF, download, file and
technical operations, using existing open-source tools rather than reimplementing codecs
and formats.

Early success: someone installs the app, opens the light tools immediately, and installs
the heavy ones without leaving it. Then they follow the progress, cancel safely, and find
the output file without touching a terminal.

## Positioning

A local, task-oriented bench — not a collection of exposed CLIs. Every tool is translated
into a coherent operation, with presets, a predictable output, progress, history and
errors a person can act on.

## Operating Context

- Windows desktop.
- Local files, and operations that may be long or batched.
- Some flows use the network by nature, especially downloads and updates.
- The product does not use AI.
- The installer carries the core and the light tools.
- Heavy tools are downloaded, verified and installed inside the app, on demand.

## Capabilities and Constraints

Confirmed: Tauri as the builder; integration of open-source tools; FFmpeg, yt-dlp, PDFs,
images, video, format conversion and the developer utilities named in the original
request; no AI. The first version targets Windows x64 only.

The repository is public and the project's own code is MIT. That does not change the
licences of the third-party components, which stay recorded individually.

Decided since: the product is called **ToolHaven**; the interface is in **English**;
delivery is **hybrid** — light tools in the installer, heavy ones downloaded by the app,
so the user never installs anything by hand.

Still open: how to slice the broad list into deliverable pieces; the update policy;
support for proprietary formats; telemetry. There is no hard size limit, but the
installer has to stay light, because the heavy components do not travel in it.

yt-dlp is in the first version as an on-demand install. Choosing it also installs Deno
and the media components it needs.

"Upscale" without AI means high-quality resampling. It increases dimensions; it does not
recover detail that was never there.

## Evidence on Hand

- The original product request.
- `Diego.md` was read only as collaboration context. It is neither a requirement nor
  copied into the project.
- There is still no brand, logo, metric, user research or visual reference beyond the
  icon and the design system built here. Future work must not invent those.

## Product Principles

1. One app manages every installation; no mandatory external setup.
2. Local by default, and transparent whenever the network is used.
3. Tasks, not flags: the interface speaks in terms of the result you want.
4. Control and recovery: preview, cancellation, history, atomic outputs.
5. Replaceable, auditable integrations, each with its version, hash and licence recorded.
