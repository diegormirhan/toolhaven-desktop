# Tool matrix

## How each tool reaches the user

The user never installs anything by hand. Either the tool travels in the installer, or
the app downloads it.

| Channel | Tools |
|---|---|
| **In the installer** (9) | jq, yq, ripgrep, fd, Miller, tokei, hexyl, Dust, Oxipng |
| **Downloaded by the app** (9) | FFmpeg, ffprobe, yt-dlp, Deno, qpdf, libvips, Poppler, Pandoc, Difftastic |
| **No pinned artifact yet** (4) | 7-Zip, MKVToolNix, ImageMagick, ExifTool |

Why the last four are not in the automatic channel:

| Tool | Obstacle |
|---|---|
| 7-Zip | Distributed as an NSIS `.exe` installer or as a `.7z`. Extracting a `.7z` needs 7-Zip itself — the app would need it in order to install it. |
| MKVToolNix | The same: an `.exe` installer or a portable `.7z`. |
| ImageMagick | GitHub publishes only a 728 MB `.7z`. The portable `.zip` has no versioned URL that resolves. |
| ExifTool | `exiftool.org` keeps only the current release online, so there is no stable versioned URL to pin. SourceForge has one, but behind a mirror redirect. |

None of those is a licensing block — it is distribution format. Solving it means either
supporting `.7z` and NSIS in the component installer, or repackaging the artifacts into a
channel of our own, which brings redistribution responsibility with it.

**On FFmpeg:** the project publishes no Windows binaries. What is pinned is the **LGPL**
build from `BtbN/FFmpeg-Builds`, at the dated tag `autobuild-2026-09-06-13-06`, which is
immutable — the same repository's `latest` tag is rolling and cannot be pinned. The LGPL
variant is the conservative route `LICENSING.md` recommends: it avoids `--enable-gpl` at
the cost of a few codecs.

## Validated on 2026-09-07

Every row below had its licence, origin and Windows build availability checked against
the upstream sources on that date. All five were **integrated the same day**: a card, a
Rust adapter with typed argv, operations in the panel, and a contract test.

All five ran against the real binary. The contract sweep executes every operation over
generated fixtures and passed on all of them. When a tool is not installed, the test skips
it and **names what it could not verify** rather than passing quietly; and the app does not
lie about it either — without the binary, the card offers "Get it", not "Open".

| Tool | Operations integrated | Licence verified | Real contract |
|---|---|---|---|
| ExifTool 13.59 | read metadata, strip metadata, set title | `Artistic-1.0-Perl OR GPL-1.0-or-later` ("same terms as Perl itself") | ✅ verified |
| Poppler 25.07 | extract text, page as image | `GPL-2.0-only OR GPL-3.0-only` | ✅ verified |
| Oxipng 10.1.1 | lossless PNG optimisation | `MIT` | ✅ verified |
| MKVToolNix 100 | convert to MKV, inspect tracks | `GPL-2.0-or-later` | ✅ verified |
| ImageMagick 7.1.2 | convert format, convert to grey, inspect | `ImageMagick` (permissive; requires attribution and a copy of the licence) | ✅ verified |

Installed on this machine with:

```powershell
winget install -e --id Shssoichiro.Oxipng
winget install -e --id MoritzBunkus.MKVToolNix
winget install -e --id oschwartz10612.Poppler
```

Caveats that have to become tasks before any of them turns `bundled`:

- **Poppler and MKVToolNix are GPL.** ToolHaven invokes them as separate processes, with
  an argument array, with no linking — the usual aggregation position. Even so, both enter
  only as on-demand packages, with a corresponding source offer.
- **ImageMagick's Windows distribution embeds delegates** under their own licences. The
  ImageMagick licence being permissive is not enough: the exact artifact needs its
  inventory before a hash is pinned.
- **ExifTool is packaged Perl.** The Windows executable carries an interpreter, and the
  notices for that packaging have to travel with it.
- **Xpdf is not Poppler.** The `pdftotext.exe` that appears on many machines' PATH comes
  from Git for Windows and is Xpdf 4.06, a different project with its own commercial
  licensing — and with Poppler installed, it **still comes first on PATH**. So detection
  uses `pdftoppm.exe`, which Xpdf does not ship, and every Poppler command resolves from
  that installation's directory rather than from PATH.
- **The MKVToolNix installer does not touch PATH.** It lands in `%ProgramFiles%\MKVToolNix`,
  which is now a directory the host knows about.

## Dev tools added on 2026-09-07

All permissively licensed, with official Windows binaries, installed through winget and
verified by the contract sweep. All of them are **read-only**: they write to stdout, never
to disk, so they have no destination and no risk of overwriting a file.

| Tool | Gap it closes | Licence | Command |
|---|---|---|---|
| Miller 6.20 | CSV, TSV and JSON — the catalog had nothing tabular | `BSD-2-Clause` | `mlr.exe` |
| Difftastic 0.70 | compare two files by syntax rather than by line | `MIT` | `difft.exe` |
| tokei 12.1 | code statistics per language | `MIT OR Apache-2.0` | `tokei.exe` |
| hexyl 0.17 | look at the bytes of an unfamiliar file | `MIT OR Apache-2.0` | `hexyl.exe` |
| Dust 1.2 | find out what is taking the disk space | `Apache-2.0` | `dust.exe` |

```powershell
winget install -e --id Miller.Miller
winget install -e --id Wilfred.difftastic
winget install -e --id XAMPPRocky.Tokei
winget install -e --id sharkdp.hexyl
winget install -e --id bootandy.dust
```

Notes:

- **tokei without serialisation.** The prebuilt binary is published without the
  serialisation formats, so `--output json` does not work. The adapter uses the table
  output instead of promising something that would break.
- **Difftastic needs two files.** It is the first operation in the catalog with that
  shape; the host refuses before starting the process, and the panel only enables "Run"
  once both are chosen.
- **tokei has no current Windows binary.** Upstream stopped publishing them; the latest
  tag has no assets at all. What ships is 12.1.2, from January 2021. A five-year-old
  binary is bad and a permanently dead card is worse, so it is pinned and flagged here —
  building from source in CI is the actual fix.

## Rejected, with the reason

| Tool | Why it stays out |
|---|---|
| Ghostscript | AGPL-3.0, with a parallel commercial licence from Artifex, who treat distribution alongside non-AGPL software as a violation and state they act on it. Incompatible with an MIT app that installs the component for the user. It would enter only if ToolHaven itself became AGPL. |
| Tesseract | The Apache-2.0 licence is not the problem. The engine in versions 4 and 5 is an LSTM neural network, and `PRODUCT.md` says the product does not use AI; the roadmap lists "neural OCR" as out of scope. Rejected on product grounds, not licensing. |
| pngquant | GPL-3.0-or-later, with a commercial licence offered explicitly for non-GPL applications. Even across a process boundary, upstream frames that use as a commercial case — precisely the legal ambiguity `LICENSING.md` says to avoid. Held until there is an opinion. |
| hyperfine | The MIT/Apache-2.0 licence is fine. What rejects it is what it does: hyperfine times **arbitrary shell commands supplied by the user**. Integrating it would mean offering arbitrary shell execution through the interface — exactly what ADR-0002 and the security model forbid. |

## The original survey

The table below is the first pass, kept as history. It was a list of candidates, not of
approved dependencies, and most of its rows have since been decided above.

| Area | Candidate | Role | Delivery | Initial state | Note |
|---|---|---|---|---|---|
| Video/audio | FFmpeg + ffprobe | transcode, remux, trim, metadata, thumbnails | On demand | MVP | The build and its codecs decide LGPL vs GPL and the patent risk |
| Download | yt-dlp | media extraction and download | On demand | MVP | The official executable includes components under additional licences |
| yt-dlp runtime | Deno | solve YouTube's JS challenges | On-demand dependency | MVP | Recommended upstream; pin a compatible version |
| Images | libvips CLI | resize, crop, convert, compress, batch | On demand | spike | Fast and frugal; the Windows distribution includes DLLs |
| Simple images | Rust `image` | small operations with no external process | Embedded | evaluate | A smaller bundle, but narrower format coverage |
| Structural PDF | qpdf | merge, split, rotate, encrypt, linearize | Embedded at first | MVP | Apache-2.0; neither renders nor extracts text |
| PDF rendering | PDFium | preview and rasterisation | Undecided | spike | BSD-style core, with transitive notices to audit |
| Metadata | ExifTool | broad reading and editing | On demand | post-MVP | Perl Artistic/GPL; packaging and notices need review |
| Archives | 7-Zip | compress and extract | Embedded if the package stays light | post-MVP | LGPL, with a separate restriction on the unRAR code |
| Documents | LibreOffice headless | Office ↔ PDF and open formats | On demand | future | Very large; fidelity varies; complex to distribute |
| Text conversion | Pandoc | markup documents and ebooks | On demand | future | GPL; the redistribution impact needs a legal opinion |
| Checksums | Native Rust | hashing and verification | Embedded | post-MVP | Needs no sidecar |
| JSON/YAML | Native Rust | format, validate, convert | Embedded | post-MVP | "Dev tools" needed a user definition |

## Recommended capability profiles

### Media

- Convert the container or the format.
- Extract audio.
- Compress towards a simple target — approximate quality or size.
- Trim without re-encoding where possible, and explain when a re-encode is unavoidable.
- Inspect streams and metadata.

### Images

- Resize by dimensions, percentage or bound.
- Manual crop and aspect-ratio presets.
- Batch conversion with a conflict policy.
- Compression with an estimated preview.
- Classic upscaling (Lanczos), with no promise of "recovering detail".

### PDFs

- Merge, split, reorder, rotate, extract pages.
- Optimise or linearise, and compress where applicable.
- Add or remove a password where the document allows it.
- Preview through a renderer separate from the structural tool.

### Downloads

- A public URL, its metadata, a video or audio choice, and a destination.
- A queue, a concurrency limit and progress.
- Cookies and authentication only if explicitly approved later.
- A clear message about the user's responsibility and the site's terms.

## What not to promise

- "Any file", without a tested input/output matrix.
- Compression to an exact size in a single pass.
- Upscaling with real detail gain and no AI.
- DRM removal, access bypass, or downloading unauthorised content.
- Perfect fidelity for proprietary documents.

## Sources checked

- Miller: https://github.com/johnkerl/miller
- Difftastic: https://github.com/Wilfred/difftastic
- tokei: https://github.com/XAMPPRocky/tokei
- hexyl: https://github.com/sharkdp/hexyl
- Dust: https://github.com/bootandy/dust
- hyperfine: https://github.com/sharkdp/hyperfine
- ExifTool: https://exiftool.org/ and https://github.com/exiftool/exiftool
- Poppler: https://poppler.freedesktop.org/ and https://github.com/oschwartz10612/poppler-windows
- Oxipng: https://github.com/oxipng/oxipng
- MKVToolNix: https://mkvtoolnix.download/
- ImageMagick: https://imagemagick.org/license/
- Ghostscript: https://ghostscript.com/licensing/ and https://artifex.com/licensing
- Tesseract: https://github.com/tesseract-ocr/tesseract
- pngquant: https://github.com/kornelski/pngquant
- FFmpeg legal: https://ffmpeg.org/legal.html
- yt-dlp: https://github.com/yt-dlp/yt-dlp and https://github.com/yt-dlp/yt-dlp/wiki/EJS
- libvips: https://github.com/libvips/libvips
- qpdf: https://github.com/qpdf/qpdf
- PDFium: https://github.com/chromium/pdfium
