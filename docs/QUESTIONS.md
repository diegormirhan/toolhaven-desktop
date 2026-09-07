# Product interview

These questions are ordered by how much they move architecture, licensing and scope. A
question leaves this file when the decision is made, not when the code works around it.

## Answered

1. **Initial scope:** the operations named in the original request — dev tools, media,
   images, PDFs, downloads, video and broad conversion. Delivery is sliced into vertical
   flows so that "universal" never becomes an untested promise.
2. **Licence and repository:** public repository; the project's own code under MIT.
3. **First platform:** Windows x64 only. ARM64 belongs to a later phase.
4. **Size:** no hard limit, but heavy tools do not travel in the installer — the app
   downloads them.
5. **yt-dlp in v1:** included as an on-demand install. The app also resolves Deno,
   FFmpeg/ffprobe and any other declared dependency.
6. **Visual language:** dynamic cards and rails, taking Netflix's discovery and Fortnite's
   tiles as behavioural references, with interaction guided by Apple's design principles.
   No green in the palette.
7. **Name:** ToolHaven. `unified-toolkit-desktop` remains only the directory name.
8. **Theme:** light and dark, with "system" as the default and the choice persisted
   locally. Decided and implemented on 2026-09-06.
9. **Tool delivery:** hybrid, confirmed on 2026-09-07. The user **never** installs
   anything by hand: light tools ship in the installer, heavy ones are downloaded by the
   app itself. A ~15 MB installer instead of a ~1 GB one.
10. **OCR / Tesseract:** stays out. The no-AI rule holds literally, even at the cost of
    text extraction from scanned PDFs.
11. **Interface language:** decided on 2026-09-07 — the interface, the host messages, the
    README and the documentation are in English. There is no i18n layer, so a second
    language would mean rewriting every string rather than changing a config.

## Settled by the code, not yet ratified

This is what the implementation currently does. If the answer should be different, the
cost of changing it is still low, which is why it stays listed.

12. **Where the flow starts:** the catalog is the main route, and "choose a file first" is
    an optional shortcut on the home screen. The earlier recommendation was the reverse;
    the implementation followed the catalog because of the installation states.

## Still blocking release decisions

13. **The primary user besides you:** general public, creators, developers or power users?
    Choosing one avoids an interface that tries to serve everybody and serves nobody.
14. **Persisting the queue and the history:** both are per session today and are lost on
    restart. The recommendation is to persist metadata only, with a clear button and a
    configurable retention. This decides whether SQLite arrives now or later.
15. **Cancellation:** the queue cancels nothing. Killing a process tree on Windows needs
    Job Objects and a per-operation cleanup rule. That is engineering scope, but the
    product expectation has to be confirmed first: is cancelling a v1 requirement?
16. **Updating the app shell:** a signed auto-update, or only a notice pointing at the new
    installer? The heavy components already have in-app updating.

## Brand and presentation

17. Which products should feel like quality relatives, without being copied?
18. Should the portfolio emphasise integration engineering, user experience, or both
    equally?
19. Do you prefer **comp-first** (a reference image before the code; bolder and slower) or
    **code-first** (a runnable v0 early; leaner)? In practice the project has been
    code-first throughout.

## Legal and ethical limits

20. Do authenticated downloads and cookies enter? The recommendation is no for the MVP.
21. Is the product a portfolio piece, a free public release, or is there commercial intent?
22. Do you accept dropping codecs and formats when their distribution is legally ambiguous?
