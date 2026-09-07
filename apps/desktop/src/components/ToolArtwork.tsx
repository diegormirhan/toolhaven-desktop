import type { ReactNode } from "react";

/**
 * One drawing per integration, all sharing a 200×100 grid, the same stroke weights
 * and the card accent as `currentColor`. They read as a set on a rail instead of
 * a pile of unrelated illustrations.
 */
const glyphByToolId: Record<string, ReactNode> = {
  qpdf: (
    <>
      <rect className="aw-soft" x="52" y="20" width="52" height="66" rx="5" transform="rotate(-9 78 53)" />
      <rect className="aw-soft" x="74" y="17" width="52" height="66" rx="5" transform="rotate(-4 100 50)" />
      <rect className="aw-line" x="96" y="15" width="52" height="66" rx="5" />
      <path className="aw-line" d="M108 33h29M108 46h29M108 59h17" strokeLinecap="round" />
    </>
  ),
  libvips: (
    <>
      <rect className="aw-soft" x="46" y="18" width="108" height="66" rx="4" />
      <path className="aw-line" d="M62 34V26h8M138 26h8v8M146 68v8h-8M70 76h-8v-8" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M62 70l16-16 11 10 14-18 17 24" strokeLinejoin="round" />
      <circle className="aw-solid" cx="76" cy="40" r="4.5" />
    </>
  ),
  "yt-dlp": (
    <>
      <path className="aw-soft" d="M70 28H56M144 28h-14M64 48h-9M145 48h-9" strokeLinecap="round" />
      <path className="aw-line" d="M100 16v44M84 48l16 16 16-16" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M58 82h84" strokeLinecap="round" />
    </>
  ),
  ffmpeg: (
    <>
      <rect className="aw-soft" x="38" y="22" width="46" height="56" rx="6" />
      <g className="aw-soft-fill">
        <rect x="43" y="30" width="7" height="7" rx="2" />
        <rect x="43" y="46" width="7" height="7" rx="2" />
        <rect x="43" y="62" width="7" height="7" rx="2" />
        <rect x="72" y="30" width="7" height="7" rx="2" />
        <rect x="72" y="46" width="7" height="7" rx="2" />
        <rect x="72" y="62" width="7" height="7" rx="2" />
      </g>
      <path className="aw-line" d="M94 50h14M103 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M124 42v16M136 30v40M148 38v24M160 46v8" strokeLinecap="round" strokeWidth="4" />
    </>
  ),
  ffprobe: (
    <>
      <path className="aw-soft" d="M40 26h50M40 40h38M40 54h46M40 68h28" strokeLinecap="round" />
      <circle className="aw-line" cx="132" cy="44" r="22" />
      <path className="aw-line" d="M120 44h6l4-9 5 18 4-9h5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path className="aw-line" d="M148 60l14 14" strokeLinecap="round" />
    </>
  ),
  jq: (
    <>
      <path className="aw-line" d="M76 22c-10 0-6 22-16 28 10 6 6 28 16 28" strokeLinecap="round" />
      <path className="aw-line" d="M124 22c10 0 6 22 16 28-10 6-6 28-16 28" strokeLinecap="round" />
      <path className="aw-soft" d="M88 34h24M96 50h20M88 66h24" strokeLinecap="round" />
    </>
  ),
  yq: (
    <>
      <path className="aw-soft" d="M52 24v56M70 42v38" />
      <path className="aw-line" d="M52 24h14M70 42h14M88 60h14M70 80h14" strokeLinecap="round" />
      <path className="aw-soft" d="M108 24h40M120 42h28M134 60h24M120 80h28" strokeLinecap="round" />
    </>
  ),
  ripgrep: (
    <>
      <path className="aw-soft" d="M44 24h86M44 38h62M44 76h78M44 90h48" strokeLinecap="round" />
      <rect className="aw-fill" x="40" y="48" width="86" height="18" rx="5" />
      <path className="aw-line" d="M50 57h66" strokeLinecap="round" />
      <path className="aw-line" d="M140 40v34" strokeLinecap="round" />
      <path className="aw-line" d="M134 40h12M134 74h12" strokeLinecap="round" strokeWidth="2.5" />
    </>
  ),
  fd: (
    <>
      <path className="aw-soft" d="M46 28h20l6 8h32a5 5 0 0 1 5 5v29a5 5 0 0 1-5 5H46a5 5 0 0 1-5-5V33a5 5 0 0 1 5-5z" />
      <path className="aw-line" d="M126 34l14 16-14 16" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-soft" d="M150 50h12" strokeLinecap="round" />
    </>
  ),
  "7zip": (
    <>
      <rect className="aw-soft" x="38" y="20" width="48" height="60" rx="6" />
      <path className="aw-soft" d="M62 20v60" strokeDasharray="6 6" />
      <path className="aw-line" d="M98 50h16M107 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="aw-line" x="124" y="34" width="40" height="32" rx="6" />
      <path className="aw-solid-line" d="M144 34v32" />
    </>
  ),
  pandoc: (
    <>
      <path className="aw-soft" d="M38 18h30l14 14v44a5 5 0 0 1-5 5H43a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5z" />
      <path className="aw-soft" d="M68 18v14h14" />
      <path className="aw-line" d="M96 50h16M105 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M124 18h30l14 14v44a5 5 0 0 1-5 5h-34a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5z" />
      <path className="aw-line" d="M154 18v14h14" />
      <path className="aw-line" d="M134 52h24M134 64h16" strokeLinecap="round" strokeWidth="2.5" />
    </>
  ),
  poppler: (
    <>
      <path className="aw-soft" d="M44 18h32l14 14v50a5 5 0 0 1-5 5H49a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5z" />
      <path className="aw-soft" d="M76 18v14h14" />
      <path className="aw-line" d="M56 48h22M56 60h22M56 72h14" strokeLinecap="round" strokeWidth="2.5" />
      <path className="aw-line" d="M104 50h16M113 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="aw-line" x="130" y="26" width="40" height="48" rx="4" />
      <path className="aw-line" d="M136 64l10-11 7 7 9-12 8 16" strokeLinejoin="round" strokeWidth="2.5" />
      <circle className="aw-solid" cx="145" cy="40" r="4" />
    </>
  ),
  imagemagick: (
    <>
      <rect className="aw-soft" x="38" y="24" width="52" height="52" rx="6" transform="rotate(-8 64 50)" />
      <rect className="aw-line" x="62" y="20" width="52" height="52" rx="6" />
      <path className="aw-line" d="M128 50h16M137 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <g className="aw-soft-fill">
        <circle cx="158" cy="34" r="7" />
        <circle cx="172" cy="52" r="7" />
        <circle cx="150" cy="60" r="7" />
      </g>
    </>
  ),
  oxipng: (
    <>
      <rect className="aw-soft" x="34" y="18" width="52" height="64" rx="6" />
      <rect className="aw-line" x="120" y="34" width="46" height="32" rx="6" />
      <path className="aw-line" d="M96 50h14M105 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-soft" d="M44 66l12-14 8 8 10-13" strokeLinejoin="round" strokeWidth="2.5" />
      <path className="aw-line" d="M130 50h26" strokeLinecap="round" strokeWidth="2.5" />
    </>
  ),
  exiftool: (
    <>
      <rect className="aw-soft" x="40" y="20" width="56" height="60" rx="6" />
      <path className="aw-soft" d="M50 66l14-16 9 9 11-14" strokeLinejoin="round" strokeWidth="2.5" />
      <circle className="aw-soft-fill" cx="60" cy="36" r="5" />
      <path className="aw-line" d="M112 30h48M112 46h34M112 62h44M112 78h26" strokeLinecap="round" strokeWidth="2.5" />
      <path className="aw-line" d="M104 30v48" strokeLinecap="round" />
    </>
  ),
  mkvtoolnix: (
    <>
      <rect className="aw-soft" x="36" y="22" width="128" height="56" rx="7" />
      <path className="aw-soft" d="M36 40h128M36 60h128" />
      <path className="aw-line" d="M52 31h44" strokeLinecap="round" strokeWidth="4" />
      <path className="aw-line" d="M52 50h72" strokeLinecap="round" strokeWidth="4" />
      <path className="aw-line" d="M52 69h30" strokeLinecap="round" strokeWidth="4" />
    </>
  ),
  miller: (
    <>
      <rect className="aw-soft" x="34" y="22" width="60" height="56" rx="5" />
      <path className="aw-soft" d="M34 38h60M34 58h60M54 22v56M74 22v56" />
      <path className="aw-line" d="M110 50h16M119 44l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M150 24c-9 0-5 20-14 26 9 6 5 26 14 26" strokeLinecap="round" />
      <path className="aw-soft" d="M144 40h18M148 50h14M144 62h18" strokeLinecap="round" strokeWidth="2.5" />
    </>
  ),
  hexyl: (
    <>
      <rect className="aw-soft" x="36" y="22" width="128" height="56" rx="6" />
      <path className="aw-soft" d="M112 22v56" />
      <g className="aw-line" strokeLinecap="round" strokeWidth="4">
        <path d="M48 36h10M64 36h10M80 36h14M48 50h14M68 50h10M84 50h10M48 64h10M64 64h14" />
      </g>
      <g className="aw-soft" strokeLinecap="round" strokeWidth="4">
        <path d="M124 36h28M124 50h20M124 64h24" />
      </g>
    </>
  ),
  tokei: (
    <>
      <path className="aw-soft" d="M40 84V20" strokeLinecap="round" />
      <path className="aw-soft" d="M40 84h124" strokeLinecap="round" />
      <g className="aw-line" strokeLinecap="round" strokeWidth="10">
        <path d="M60 84V44M86 84V28M112 84V56M138 84V38" />
      </g>
    </>
  ),
  difftastic: (
    <>
      <rect className="aw-soft" x="32" y="20" width="60" height="60" rx="5" />
      <rect className="aw-line" x="108" y="20" width="60" height="60" rx="5" />
      <path className="aw-soft" d="M44 36h34M44 50h26M44 64h34" strokeLinecap="round" strokeWidth="2.5" />
      <path className="aw-line" d="M120 36h34M120 64h26" strokeLinecap="round" strokeWidth="2.5" />
      <rect className="aw-fill" x="114" y="43" width="48" height="14" rx="4" />
      <path className="aw-line" d="M120 50h30" strokeLinecap="round" strokeWidth="2.5" />
    </>
  ),
  dust: (
    <>
      <path className="aw-soft" d="M40 26h20l6 8h30a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H40a5 5 0 0 1-5-5V31a5 5 0 0 1 5-5z" />
      <g className="aw-line" strokeLinecap="round" strokeWidth="9">
        <path d="M120 32h44M120 50h28M120 68h14" />
      </g>
    </>
  ),
  deno: (
    <>
      <rect className="aw-soft" x="42" y="20" width="116" height="60" rx="9" />
      <path className="aw-line" d="M60 38l11 12-11 12" strokeLinecap="round" strokeLinejoin="round" />
      <path className="aw-line" d="M80 62h26" strokeLinecap="round" />
      <path className="aw-soft" d="M118 38h24" strokeLinecap="round" />
    </>
  ),
};

const fallbackGlyph = (
  <>
    <rect className="aw-soft" x="52" y="20" width="96" height="60" rx="8" />
    <path className="aw-line" d="M70 50h60" strokeLinecap="round" />
  </>
);

export function ToolArtwork({ toolId, label }: { toolId: string; label: string }) {
  return (
    <div className="tool-artwork" aria-hidden="true">
      <span className="artwork-rail" />
      <svg viewBox="0 0 200 100" fill="none" strokeWidth="3">
        {glyphByToolId[toolId] ?? fallbackGlyph}
      </svg>
      <span className="artwork-index">{label}</span>
    </div>
  );
}
