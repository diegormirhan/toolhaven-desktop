# Known limitations

Stated because they are real, not because they are theoretical. Everything here
is true of the current release; when one stops being true it leaves this file.

- **7-Zip is the standalone build, so it does not read rar.** The full `7z.exe`
  ships only in an installer that demands elevation, and no tool here is worth a
  UAC prompt. What ships reads and writes 7z, zip, tar, gzip, bzip2 and xz, and
  the card claims exactly that.

- **Enlarging with a model needs a Vulkan-capable GPU.** Neither published build
  has a working CPU path, so a machine without a Vulkan driver cannot use that
  one operation. Every other image operation is unaffected.

- **An operation can be stopped but not paused.** Stopping kills the process
  tree through a Job Object, which is immediate and complete; there is no way to
  resume from where it was.

- **Only half the update path has been exercised.** The check against the live
  endpoint is verified: it fetches the manifest, verifies the signature, and
  correctly finds nothing newer when there is nothing newer. The
  download-and-install half waits on a release newer than the one installed, and
  Tauri refuses a non-HTTPS endpoint, so there is no local rehearsal for it.

- **The bundled tokei is from January 2021.** Upstream stopped publishing
  Windows binaries; the current tag has no artifacts at all. A five-year-old
  binary is bad, a permanently dead card is worse, and building from source in
  CI is the actual fix.

- **Two languages, and no way to add a third without a build.** English and
  Brazilian Portuguese are compiled in. A dictionary is a file and an entry in
  one map — a small change, but a change to the source, not a file somebody can
  drop into a folder.

- **Only Windows x64.** ARM64 and the other platforms are not attempted, and the
  component store pins Windows artifacts exclusively.

- **Unsigned.** SmartScreen will warn on the installer until there is a
  certificate. SHA-256 checksums are published with every release so a download
  can be verified by hand.

## What was here and is not any more

- *The interface is English only* — Portuguese arrived in 3.0.0.
- *PDF text extraction only reads text, and OCR is out by the no-AI rule* —
  Tesseract ships, and the rule it broke turned out to be the wrong rule. See
  [what it refuses to do](README.md#what-it-refuses-to-do).
