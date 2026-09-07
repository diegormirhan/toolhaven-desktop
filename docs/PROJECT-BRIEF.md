# Project brief

## The problem

On Windows, simple tasks — extracting audio, shrinking an image, merging PDFs,
inspecting metadata, converting a file — usually mean discovering a tool, installing
dependencies, dealing with PATH, and learning a different set of flags for each one.

## The proposal

A local application that organises those capabilities by what the user is trying to
achieve. The core carries the light tools and installs the larger ones itself. Everything
shares one language for input, output, presets, progress, cancellation, errors and
history.

## What it is not

- A complete professional video, image or PDF editor.
- A terminal in disguise.
- A platform for arbitrary plugins, in the first version.
- A promise to convert any format with perfect fidelity.
- An AI product.

## The MVP hypothesis

A first release should prove four vertical flows:

1. **Media:** convert video and audio, extract audio, compress video.
2. **Images:** resize, crop, compress, convert in batch.
3. **PDF:** merge, split, rotate, compress, and protect or unprotect where the file
   allows it.
4. **Download:** fetch public media with a format choice and visible progress.

Archives, OCR, Office documents, automation and the developer tools come after the job
engine and the packaging are proven.

## Support levels

- **Guaranteed:** a combination covered by fixtures, a test and its own error message.
- **Experimental:** the tool accepts it, but fidelity is known to vary.
- **Unsupported:** the format is recognised, and the app explains the limitation instead
  of attempting a destructive conversion.

## MVP success criteria

- A clean install on a Windows VM with no development dependencies.
- A heavy tool can be discovered, downloaded, verified, installed and opened without
  leaving the application.
- Four vertical flows completed without a terminal.
- Cancelling never leaves a partial output carrying the final name.
- Errors show a useful action and preserve the original file.
- Every distributed binary appears under "About > Open-source components".
- A reproducible build produces the installer, hashes, an SBOM and third-party notices.

## Main risks

1. The infinite scope of formats and tools.
2. Interrupted downloads, duplicated storage, and updating tool packs.
3. Transitive licences in prebuilt binaries, FFmpeg and yt-dlp above all.
4. Antivirus and SmartScreen against binaries with little reputation or no signature.
5. Frequent changes in the sites yt-dlp supports.
6. Limited fidelity for proprietary document formats.
