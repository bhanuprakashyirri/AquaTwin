"use client";

/**
 * AquaTwin imagery system.
 *
 * No external image-generation tool is available in this environment, so the
 * editorial photography is rendered as art-directed SVG scenes. They are:
 *  - self-contained (work fully offline, no network, no API keys)
 *  - resolution-independent (crisp on retina / large hero areas)
 *  - consistent with the AquaTwin palette (muted greens, warm light, sage)
 *  - free of text, logos, UI, holograms, neon
 *
 * Scenes are used ONLY for storytelling (hero, problem, login, CTA).
 * All data visualization in the product uses real components (MapLibre, Recharts).
 */

import { useId } from "react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Crop-row texture pattern: base tone + diagonal row lines. */
function RowPattern({
  id,
  base,
  line,
  angle = 8,
  spacing = 15,
  lineWidth = 3.5,
  opacity = 0.55,
}: {
  id: string;
  base: string;
  line: string;
  angle?: number;
  spacing?: number;
  lineWidth?: number;
  opacity?: number;
}) {
  return (
    <pattern
      id={id}
      width={spacing}
      height={spacing}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${angle})`}
    >
      <rect width={spacing} height={spacing} fill={base} />
      <line x1="0" y1="0" x2="0" y2={spacing} stroke={line} strokeWidth={lineWidth} opacity={opacity} />
    </pattern>
  );
}

/* ------------------------------------------------------------------ */
/* 1. HERO — aerial rice field, early morning                          */
/* ------------------------------------------------------------------ */

export function AerialFieldScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const sky = `sky${uid}`;
  const wash = `wash${uid}`;
  const water = `water${uid}`;
  const mist = `mist${uid}`;
  const p1 = `p1${uid}`;
  const p2 = `p2${uid}`;
  const p3 = `p3${uid}`;
  const p4 = `p4${uid}`;
  const p5 = `p5${uid}`;

  return (
    <svg
      viewBox="0 0 1200 760"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Aerial view of a rice field in soft morning light"
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E3EDE6" />
          <stop offset="55%" stopColor="#EDF2EA" />
          <stop offset="100%" stopColor="#F4F6F1" />
        </linearGradient>
        <radialGradient id={wash} cx="0.28" cy="0.12" r="0.9">
          <stop offset="0%" stopColor="#FFF6E0" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#FFF6E0" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFF6E0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={water} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DCE9E6" />
          <stop offset="50%" stopColor="#C3DAD6" />
          <stop offset="100%" stopColor="#AFCFCB" />
        </linearGradient>
        <linearGradient id={mist} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <RowPattern id={p1} base="#93B894" line="#7FAF8C" angle={7} />
        <RowPattern id={p2} base="#A9C08D" line="#97B27F" angle={11} />
        <RowPattern id={p3} base="#8FB996" line="#7CA983" angle={5} />
        <RowPattern id={p4} base="#A3BE8B" line="#92AC79" angle={9} />
        <RowPattern id={p5} base="#9BB78E" line="#89A67C" angle={13} />
      </defs>

      {/* sky */}
      <rect width="1200" height="230" fill={`url(#${sky})`} />

      {/* distant tree line */}
      <path
        d="M0 218 C90 206 150 214 240 210 C330 206 380 216 470 211 C560 206 620 215 710 210 C800 205 860 216 950 211 C1040 206 1110 214 1200 209 L1200 230 L0 230 Z"
        fill="#A9BFA8"
        opacity="0.55"
      />
      <path
        d="M0 224 C110 216 190 223 290 219 C390 215 470 224 570 219 C670 214 750 223 850 218 C950 213 1060 222 1200 216 L1200 232 L0 232 Z"
        fill="#93AC92"
        opacity="0.45"
      />

      {/* morning mist band */}
      <rect x="0" y="196" width="1200" height="52" fill={`url(#${mist})`} />

      {/* field parcels — rice paddy geometry with bunds between plots */}
      <g stroke="#C7D2C0" strokeWidth="3">
        <rect x="0" y="232" width="392" height="238" fill={`url(#${p1})`} />
        <rect x="404" y="232" width="392" height="238" fill={`url(#${p2})`} />
        <rect x="808" y="232" width="392" height="238" fill={`url(#${p3})`} />
        <rect x="0" y="482" width="392" height="278" fill={`url(#${p4})`} />
        <rect x="404" y="482" width="392" height="278" fill={`url(#${p5})`} />
        <rect x="808" y="482" width="392" height="278" fill={`url(#${p1})`} />
      </g>

      {/* subtle crop variation — a few lighter patches */}
      <ellipse cx="210" cy="330" rx="90" ry="46" fill="#B9CBA0" opacity="0.28" />
      <ellipse cx="990" cy="360" rx="110" ry="52" fill="#B9CBA0" opacity="0.24" />
      <ellipse cx="600" cy="600" rx="130" ry="60" fill="#8FAE86" opacity="0.22" />
      <ellipse cx="180" cy="620" rx="80" ry="40" fill="#8FAE86" opacity="0.2" />

      {/* irrigation channel — diagonal, reflecting the sky */}
      <path
        d="M-20 700 C240 640 420 660 640 560 C820 480 980 470 1220 400 L1220 470 C1000 540 840 555 660 630 C460 712 260 700 -20 770 Z"
        fill={`url(#${water})`}
        opacity="0.92"
      />
      <path
        d="M-20 716 C240 656 420 676 640 576 C820 496 980 486 1220 416"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <path
        d="M-20 742 C240 682 430 700 650 600 C830 522 990 512 1220 442"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        opacity="0.3"
      />

      {/* scattered trees with soft shadows */}
      {[
        { x: 62, y: 252, r: 13 },
        { x: 452, y: 246, r: 10 },
        { x: 838, y: 254, r: 12 },
        { x: 1130, y: 250, r: 9 },
        { x: 330, y: 500, r: 11 },
        { x: 742, y: 506, r: 12 },
      ].map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x + 4} cy={t.y + t.r * 0.9} rx={t.r * 1.15} ry={t.r * 0.4} fill="#5E7A63" opacity="0.25" />
          <circle cx={t.x} cy={t.y} r={t.r} fill="#6E8F76" />
          <circle cx={t.x - t.r * 0.25} cy={t.y - t.r * 0.3} r={t.r * 0.62} fill="#7FA083" />
        </g>
      ))}

      {/* morning light wash + gentle vignette */}
      <rect width="1200" height="760" fill={`url(#${wash})`} />
      <rect width="1200" height="760" fill="none" stroke="#17352D" strokeOpacity="0.05" strokeWidth="2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 2. LOGIN — Indian farmland, early morning mist                      */
/* ------------------------------------------------------------------ */

export function MorningMistScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const sky = `lsky${uid}`;
  const sun = `lsun${uid}`;
  const mist1 = `lm1${uid}`;
  const mist2 = `lm2${uid}`;
  const r1 = `lr1${uid}`;
  const r2 = `lr2${uid}`;
  const r3 = `lr3${uid}`;
  const r4 = `lr4${uid}`;

  return (
    <svg
      viewBox="0 0 1000 1250"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Indian farmland at early morning with mist over crop rows"
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9EFE7" />
          <stop offset="60%" stopColor="#F2F4EC" />
          <stop offset="100%" stopColor="#E4EBDF" />
        </linearGradient>
        <radialGradient id={sun} cx="0.5" cy="0.3" r="0.55">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FFF3D6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFF3D6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={mist1} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={mist2} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <RowPattern id={r1} base="#A9BE97" line="#93AC82" angle={4} spacing={17} />
        <RowPattern id={r2} base="#97B189" line="#829C74" angle={-3} spacing={16} />
        <RowPattern id={r3} base="#87A57B" line="#74906A" angle={2} spacing={15} />
        <RowPattern id={r4} base="#75936C" line="#63805B" angle={-2} spacing={14} />
      </defs>

      <rect width="1000" height="1250" fill={`url(#${sky})`} />
      <rect width="1000" height="620" fill={`url(#${sun})`} />

      {/* distant hills */}
      <path d="M0 470 C140 430 260 452 400 438 C540 424 660 452 800 440 C890 432 950 444 1000 436 L1000 500 L0 500 Z" fill="#B4C4A9" opacity="0.6" />
      <path d="M0 492 C160 462 300 482 450 468 C600 454 720 482 860 470 C930 464 970 472 1000 466 L1000 512 L0 512 Z" fill="#9DB291" opacity="0.55" />

      {/* receding field bands */}
      <rect x="0" y="500" width="1000" height="120" fill={`url(#${r1})`} />
      <rect x="0" y="620" width="1000" height="150" fill={`url(#${r2})`} />
      <rect x="0" y="770" width="1000" height="180" fill={`url(#${r3})`} />
      <rect x="0" y="950" width="1000" height="300" fill={`url(#${r4})`} />

      {/* bund lines separating bands */}
      {[500, 620, 770, 950].map((y) => (
        <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#C9D4BE" strokeWidth="3" opacity="0.8" />
      ))}

      {/* irrigation channel running to the horizon */}
      <path d="M470 1250 L492 500 L508 500 L530 1250 Z" fill="#CBDDD8" opacity="0.9" />
      <path d="M497 1250 L500 500" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
      <path d="M523 1250 L505 500" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.3" />

      {/* mist layers */}
      <rect x="0" y="470" width="1000" height="90" fill={`url(#${mist1})`} />
      <rect x="0" y="600" width="1000" height="70" fill={`url(#${mist2})`} />
      <rect x="0" y="750" width="1000" height="60" fill={`url(#${mist2})`} opacity="0.7" />

      {/* foreground trees */}
      {[
        { x: 120, y: 1080, r: 34 },
        { x: 880, y: 1120, r: 40 },
        { x: 700, y: 1180, r: 28 },
      ].map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x + 10} cy={t.y + t.r} rx={t.r * 1.3} ry={t.r * 0.42} fill="#4E6B54" opacity="0.28" />
          <circle cx={t.x} cy={t.y} r={t.r} fill="#5F7F66" />
          <circle cx={t.x - t.r * 0.28} cy={t.y - t.r * 0.32} r={t.r * 0.6} fill="#74937B" />
        </g>
      ))}

      {/* soft warm light from top */}
      <rect width="1000" height="1250" fill={`url(#${sun})`} opacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 3. FINAL CTA — golden hour field                                    */
/* ------------------------------------------------------------------ */

export function GoldenHourScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const sky = `gsky${uid}`;
  const glow = `gglow${uid}`;
  const water = `gwater${uid}`;
  const r1 = `gr1${uid}`;
  const r2 = `gr2${uid}`;
  const r3 = `gr3${uid}`;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Healthy agricultural field at golden hour with calm water"
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3E9D2" />
          <stop offset="55%" stopColor="#F6EEDC" />
          <stop offset="100%" stopColor="#EDE8D2" />
        </linearGradient>
        <radialGradient id={glow} cx="0.72" cy="0.34" r="0.5">
          <stop offset="0%" stopColor="#FFE9B8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#FFE9B8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFE9B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={water} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8D9AE" />
          <stop offset="100%" stopColor="#D9C48E" />
        </linearGradient>
        <RowPattern id={r1} base="#B3B983" line="#A2AC72" angle={6} spacing={18} />
        <RowPattern id={r2} base="#9CAE77" line="#8B9D66" angle={-4} spacing={17} />
        <RowPattern id={r3} base="#879E66" line="#768C58" angle={3} spacing={16} />
      </defs>

      <rect width="1600" height="900" fill={`url(#${sky})`} />
      <rect width="1600" height="560" fill={`url(#${glow})`} />

      {/* low sun */}
      <circle cx="1150" cy="330" r="52" fill="#FFE3A0" opacity="0.9" />
      <circle cx="1150" cy="330" r="78" fill="#FFE3A0" opacity="0.25" />

      {/* horizon tree line */}
      <path d="M0 420 C180 400 320 418 480 408 C640 398 780 420 940 410 C1100 400 1260 420 1420 408 C1490 404 1550 412 1600 406 L1600 440 L0 440 Z" fill="#A8A878" opacity="0.55" />

      {/* converging field rows */}
      <path d="M0 900 L560 440 L700 440 L160 900 Z" fill={`url(#${r1})`} />
      <path d="M700 440 L900 440 L1440 900 L160 900 Z" fill={`url(#${r2})`} />
      <path d="M900 440 L1600 440 L1600 900 L1440 900 Z" fill={`url(#${r3})`} />
      <path d="M0 900 L560 440 L700 440 L160 900 Z" fill="none" stroke="#C6C9A0" strokeWidth="2.5" opacity="0.7" />
      <path d="M700 440 L900 440 L1440 900 L160 900 Z" fill="none" stroke="#C6C9A0" strokeWidth="2.5" opacity="0.7" />
      <path d="M900 440 L1600 440 L1600 900 L1440 900 Z" fill="none" stroke="#C6C9A0" strokeWidth="2.5" opacity="0.7" />

      {/* calm water strip reflecting the sun */}
      <path d="M0 780 C300 760 520 776 760 764 C1000 752 1240 768 1600 748 L1600 830 C1240 850 1000 834 760 846 C520 858 300 842 0 862 Z" fill={`url(#${water})`} opacity="0.85" />
      <path d="M1080 770 C1180 764 1280 766 1380 760" fill="none" stroke="#FFF3D0" strokeWidth="3" opacity="0.65" />
      <path d="M1120 792 C1220 786 1320 788 1420 782" fill="none" stroke="#FFF3D0" strokeWidth="2" opacity="0.4" />

      {/* foreground trees */}
      {[
        { x: 90, y: 700, r: 30 },
        { x: 1520, y: 690, r: 34 },
        { x: 1330, y: 730, r: 22 },
      ].map((t, i) => (
        <g key={i}>
          <ellipse cx={t.x + 8} cy={t.y + t.r} rx={t.r * 1.25} ry={t.r * 0.4} fill="#7A7A4E" opacity="0.3" />
          <circle cx={t.x} cy={t.y} r={t.r} fill="#8A8A58" />
          <circle cx={t.x - t.r * 0.26} cy={t.y - t.r * 0.3} r={t.r * 0.58} fill="#A0A068" />
        </g>
      ))}

      <rect width="1600" height="900" fill={`url(#${glow})`} opacity="0.35" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 4. PROBLEM — four editorial scenes                                  */
/* ------------------------------------------------------------------ */

/** Over-irrigation / waterlogged soil. */
export function WaterloggedScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Waterlogged field with standing water">
      <defs>
        <linearGradient id={`wsky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4E9E2" />
          <stop offset="100%" stopColor="#EDF0E8" />
        </linearGradient>
        <linearGradient id={`wtr${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B9CDC9" />
          <stop offset="100%" stopColor="#9FBDB8" />
        </linearGradient>
      </defs>
      <rect width="600" height="420" fill={`url(#wsky${uid})`} />
      <path d="M0 150 C100 138 180 148 280 142 C380 136 460 148 600 140 L600 170 L0 170 Z" fill="#A9BFA8" opacity="0.5" />
      <rect x="0" y="160" width="600" height="260" fill={`url(#wtr${uid})`} />
      {Array.from({ length: 9 }).map((_, i) => (
        <ellipse key={i} cx={60 + i * 62} cy={210 + (i % 3) * 66} rx={26} ry={9} fill="#FFFFFF" opacity={0.22 + (i % 3) * 0.06} />
      ))}
      <path d="M0 160 C120 152 240 162 360 154 C470 147 540 158 600 152 L600 168 C480 174 360 166 240 172 C140 177 60 170 0 174 Z" fill="#8FAFAB" opacity="0.6" />
      <circle cx="96" cy="120" r="16" fill="#7E967F" opacity="0.8" />
      <circle cx="508" cy="112" r="20" fill="#7E967F" opacity="0.8" />
    </svg>
  );
}

/** Crop stress — yellowing, dry-edged rows. */
export function StressScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Stressed crop rows under harsh light">
      <defs>
        <linearGradient id={`ssky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#EFE8D6" />
          <stop offset="100%" stopColor="#F4EFE2" />
        </linearGradient>
        <RowPattern id={`sr1${uid}`} base="#C9B26A" line="#B89F58" angle={5} spacing={16} />
        <RowPattern id={`sr2${uid}`} base="#BFA45E" line="#AE9350" angle={-4} spacing={15} />
      </defs>
      <rect width="600" height="420" fill={`url(#ssky${uid})`} />
      <circle cx="470" cy="90" r="34" fill="#F2DFA8" opacity="0.85" />
      <circle cx="470" cy="90" r="52" fill="#F2DFA8" opacity="0.3" />
      <path d="M0 130 C110 118 200 130 310 122 C420 114 510 128 600 120 L600 148 L0 148 Z" fill="#B9AE83" opacity="0.5" />
      <rect x="0" y="146" width="600" height="130" fill={`url(#sr1${uid})`} />
      <rect x="0" y="276" width="600" height="144" fill={`url(#sr2${uid})`} />
      <line x1="0" y1="146" x2="600" y2="146" stroke="#D8C99A" strokeWidth="3" />
      <line x1="0" y1="276" x2="600" y2="276" stroke="#D8C99A" strokeWidth="3" />
      {/* dry patches */}
      <ellipse cx="150" cy="210" rx="52" ry="20" fill="#A98F4C" opacity="0.35" />
      <ellipse cx="430" cy="340" rx="70" ry="26" fill="#A98F4C" opacity="0.3" />
      <ellipse cx="320" cy="180" rx="34" ry="14" fill="#9C8446" opacity="0.3" />
    </svg>
  );
}

/** Uncertain weather — sun, cloud, incoming rain. */
export function WeatherScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Changing weather with sun, cloud and rain">
      <defs>
        <linearGradient id={`csky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DDE6E4" />
          <stop offset="100%" stopColor="#EBF0EC" />
        </linearGradient>
        <RowPattern id={`cr1${uid}`} base="#A9BE97" line="#93AC82" angle={6} spacing={16} />
      </defs>
      <rect width="600" height="420" fill={`url(#csky${uid})`} />
      {/* sun peeking */}
      <circle cx="140" cy="100" r="30" fill="#F6E3AC" opacity="0.9" />
      <circle cx="140" cy="100" r="48" fill="#F6E3AC" opacity="0.3" />
      {/* cloud */}
      <g fill="#C9D4CE">
        <ellipse cx="380" cy="110" rx="66" ry="30" />
        <ellipse cx="430" cy="96" rx="48" ry="26" />
        <ellipse cx="330" cy="100" rx="42" ry="22" />
      </g>
      <g fill="#B7C4BC">
        <ellipse cx="390" cy="122" rx="70" ry="22" />
      </g>
      {/* rain */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1={300 + (i % 6) * 44}
          y1={150 + Math.floor(i / 6) * 26}
          x2={294 + (i % 6) * 44}
          y2={168 + Math.floor(i / 6) * 26}
          stroke="#8FA8B8"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.65"
        />
      ))}
      {/* field below */}
      <rect x="0" y="240" width="600" height="180" fill={`url(#cr1${uid})`} />
      <line x1="0" y1="240" x2="600" y2="240" stroke="#C9D4BE" strokeWidth="3" />
      {/* wet patches where rain lands */}
      <ellipse cx="360" cy="300" rx="90" ry="26" fill="#8FAE86" opacity="0.4" />
      <ellipse cx="480" cy="350" rx="70" ry="22" fill="#8FAE86" opacity="0.35" />
    </svg>
  );
}

/** Healthy crop after optimized irrigation. */
export function HealthyScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Lush healthy crop rows after optimized irrigation">
      <defs>
        <linearGradient id={`hsky${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2EDE4" />
          <stop offset="100%" stopColor="#EFF4EC" />
        </linearGradient>
        <RowPattern id={`hr1${uid}`} base="#8FB996" line="#7CA983" angle={5} spacing={15} />
        <RowPattern id={`hr2${uid}`} base="#7FAF8C" line="#6E9C7A" angle={-3} spacing={14} />
      </defs>
      <rect width="600" height="420" fill={`url(#hsky${uid})`} />
      <circle cx="120" cy="92" r="26" fill="#F8ECC0" opacity="0.85" />
      <circle cx="120" cy="92" r="44" fill="#F8ECC0" opacity="0.28" />
      <path d="M0 128 C110 116 210 128 320 120 C430 112 520 126 600 118 L600 146 L0 146 Z" fill="#A9BFA8" opacity="0.5" />
      <rect x="0" y="144" width="600" height="132" fill={`url(#hr1${uid})`} />
      <rect x="0" y="276" width="600" height="144" fill={`url(#hr2${uid})`} />
      <line x1="0" y1="144" x2="600" y2="144" stroke="#C9D4BE" strokeWidth="3" />
      <line x1="0" y1="276" x2="600" y2="276" stroke="#C9D4BE" strokeWidth="3" />
      {/* healthy glints */}
      <ellipse cx="180" cy="200" rx="46" ry="16" fill="#B9D2B4" opacity="0.5" />
      <ellipse cx="420" cy="330" rx="60" ry="20" fill="#B9D2B4" opacity="0.45" />
      <ellipse cx="300" cy="380" rx="52" ry="18" fill="#A9C8A4" opacity="0.4" />
      {/* small trees */}
      <circle cx="520" cy="110" r="18" fill="#6E8F76" />
      <circle cx="512" cy="104" r="11" fill="#7FA083" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 5. DETAIL — subtle crop texture for editorial accents               */
/* ------------------------------------------------------------------ */

/** Close-up crop rows texture — used as a soft editorial accent band. */
export function CropDetailScene({ className }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  return (
    <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="Close-up of crop rows">
      <defs>
        <RowPattern id={`d1${uid}`} base="#93B894" line="#7FAF8C" angle={12} spacing={13} lineWidth={4} />
        <RowPattern id={`d2${uid}`} base="#87A57B" line="#74906A" angle={12} spacing={13} lineWidth={4} />
      </defs>
      <rect width="800" height="150" fill={`url(#d1${uid})`} />
      <rect y="150" width="800" height="150" fill={`url(#d2${uid})`} />
      <path d="M0 150 C200 142 400 156 600 148 C700 144 760 150 800 147 L800 158 C700 164 500 152 300 160 C180 165 80 158 0 161 Z" fill="#C9D4BE" opacity="0.7" />
      <ellipse cx="220" cy="90" rx="70" ry="26" fill="#A9C8A4" opacity="0.35" />
      <ellipse cx="560" cy="220" rx="80" ry="30" fill="#A9C8A4" opacity="0.3" />
    </svg>
  );
}
