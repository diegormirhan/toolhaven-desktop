<div align="center">

<img src="apps/desktop/src-tauri/icons/128x128.png" alt="" width="96" height="96">

# ToolHaven

[![Release](https://img.shields.io/github/v/tag/diegormirhan/toolhaven-desktop?label=release&color=88afff)](https://github.com/diegormirhan/toolhaven-desktop/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-x64-0078D4?logo=windows&logoColor=white)](#install)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](apps/desktop/src-tauri/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](apps/desktop/src/)

> Convert video, download from YouTube, edit PDFs, enlarge photos and read text out of scans — on Windows, without typing a command.

</div>

![The ToolHaven catalog in its dark theme](docs/screenshots/catalog-dark.png)

Twenty-five open-source tools — FFmpeg, yt-dlp, qpdf, ImageMagick, Tesseract and the rest — behind one window, one visual grammar and one queue. Nine of them travel inside the 16.3 MB installer; the others are downloaded, verified and installed by the app itself, in the background, with the size on screen before the download starts.

**You never open a browser, never run a package manager, never touch PATH.** Everything runs on your own machine, in English or Brazilian Portuguese.

## Features

- **Nothing to install by hand.** Every tool is pinned to an exact URL, version and SHA-256. A download that does not match its digest is refused, and nothing ever asks for administrator rights.
- **Twenty-five tools, grouped by what you want to end up with** — a smaller video, a merged PDF, a cropped photo, the text out of a scan — rather than by the project that does the work.
- **A queue that outlives the panel.** Start an operation, close the tool, and it keeps running. Stopping kills the whole process tree; the history survives a restart.
- **It updates itself**, verified against a signature compiled into the binary, and never takes the window away mid-job: the last step is a button.
- **English and Brazilian Portuguese**, switched in Settings. Every string is translated — the tools, their options, the errors and the queue.
- **No account, no cloud, no telemetry.** Two operations use a model — reading a scan and enlarging a photograph — and both run here, on your own processor or graphics card.

## Install

Download the installer from the [latest release](https://github.com/diegormirhan/toolhaven-desktop/releases/latest) and run it. Windows 10 or 11, 64-bit.

| File | What it is |
| --- | --- |
| `ToolHaven_<version>_x64-setup.exe` | Installer — recommended |
| `ToolHaven_<version>_x64_en-US.msi` | MSI, for managed deployment |
| `ToolHaven_<version>_x64-portable.zip` | Portable — unzip and run |

> [!NOTE]
> The installer is not code-signed yet, so SmartScreen warns on first run. SHA-256 checksums are published with every release, and the portable build does not update itself.

## The catalog

| Category | Tools | What you get |
| --- | --- | --- |
| **Video and audio** | FFmpeg · ffprobe · SongRec · MKVToolNix | transcode, compress, trim, GIFs, contact sheets, inspect codecs, remux to MKV, name the music that is playing |
| **Downloads** | yt-dlp · gallery-dl | video and audio from a link, and image galleries |
| **Images** | libvips · Nomos8kSC · reverse image search · ImageMagick · Oxipng · ExifTool | resize, crop, convert, enlarge with a model, find where a picture came from, optimise PNG, read and strip metadata |
| **PDFs and documents** | qpdf · Poppler · Tesseract · Pandoc | merge, split, rotate, protect, extract text, rasterise a page, OCR into a searchable PDF, convert between formats |
| **Text and data** | jq · yq · Miller · ripgrep · fd · Difftastic | JSON and YAML, CSV to JSON, search, find, structural diff |
| **Files and disk** | 7-Zip · Dust · tokei · hexyl | archives, where the space went, count code, hex preview |

![The install plan for yt-dlp, with its three dependencies](docs/screenshots/install-dialog.png)

## How it works

```
apps/desktop/src/          React 19 + TypeScript interface
apps/desktop/src-tauri/    Rust host: adapters, component store, process supervision
tooling/tools.json         every tool, pinned to a URL, a version and a SHA-256
scripts/                   manifest validation, staging, release manifest
tests/                     manifest, installation, execution and stylesheet rules
```

Three properties shape everything else:

- **No arbitrary shell, ever.** An operation is a typed request — tool, operation, inputs, output, options — that a pure resolver turns into an executable name and an argument array. No string is ever handed to a shell, so a file named `; rm -rf` is a file name.
- **The component store is keyed by digest, not by tool.** FFmpeg and ffprobe come from the same archive, so they are downloaded once. Installation stages into a sibling directory and activates with an atomic rename, under `%LOCALAPPDATA%` — never Program Files.
- **Resolution order is pinned first.** `<install dir>/tools/`, then the component store, then PATH. Git for Windows ships an Xpdf `pdftotext.exe` that usually wins on PATH; Poppler is probed through a binary Xpdf does not ship. There is a test for it.

## Build it yourself

Node 24+, Rust (MSVC toolchain) and the Visual Studio C++ build tools.

```bash
npm install
npm run tools:stage   # downloads and verifies the bundled tools
npm run tauri:dev
```

```bash
npm test              # manifest, execution, interface and component tests
npm run tauri:build   # the installer, the MSI and the portable build
```

> [!IMPORTANT]
> A release that clients can update to must be signed. Both variables are required, even when the key has no password — without the second, the build stops at a prompt no script can answer and then produces no signature at all.
>
> ```bash
> TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.toolhaven/updater.key)" \
> TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" npm run tauri:build
> ```

Artifacts are staged in `Releases/<version>/`, and `npm run release:manifest` writes the `latest.json` a release needs.

## Languages

English and Brazilian Portuguese, chosen in Settings and remembered on the machine. Translations are keyed by the English sentence itself, so the source keeps saying what it puts on screen and an untranslated string shows in English rather than as a key.

```
apps/desktop/src/i18n/pt.ts            the interface
apps/desktop/src/i18n/catalog-pt.ts    the tools, their operations and options
tests/interface/translations.test.mjs  refuses a string the dictionary has never heard of
```

## Known limitations

What this release cannot do is written down rather than discovered: what 7-Zip cannot read, what the upscaler needs from your GPU, which half of the update path is still unproven, and the rest.

→ **[LIMITATIONS.md](LIMITATIONS.md)**

## Stack

`Tauri 2` · `Rust` (host, adapters, component store) · `React 19` · `TypeScript` · `Vite` · `ureq` + `zip` + `sha2` for the installer — and no runtime dependency beyond the tools themselves.

Own code is MIT. Every third-party executable keeps its own licence, recorded with version, origin, artifact URL and SHA-256 in `vendor/THIRD-PARTY-NOTICES.txt`, generated by the build.
