import React, { useEffect, useState } from 'react';

/**
 * Renders a handwriting tracing block.
 *
 * The text is split on newlines: each line becomes its own ruled tracing row,
 * so "trace only" pages can hold multiple lines. An empty line renders a blank
 * ruled row (handy for free practice).
 *
 * Each glyph is sized to its *measured* advance width (via canvas measureText)
 * rather than a fixed box, so narrow letters (i, l) and wide ones (m, W, capitals)
 * all sit snugly. That makes `letterSpacing` behave like a real gap: 0 ≈ letters
 * touching, larger values push them apart — with no overlap or clipping.
 */
export type TracingVariant = 'editor' | 'preview' | 'print-double' | 'print-single';

interface VariantCfg {
  rowH: number;        // px height of a single ruled row
  glyphH: number;      // px rendered height of a glyph box (controls letter size)
  fontPx: number;      // glyph font size in viewBox units
  stroke: number;      // outline stroke width (viewBox units)
  startR: number;      // start-dot radius (viewBox units)
  defaultGap: number;  // default inter-letter gap (px) when no letterSpacing set
  rowGap: string;      // tailwind vertical gap between rows
}

const VARIANTS: Record<TracingVariant, VariantCfg> = {
  editor:          { rowH: 150, glyphH: 96, fontPx: 94, stroke: 1.5, startR: 3.5, defaultGap: 6, rowGap: 'gap-3' },
  preview:         { rowH: 92,  glyphH: 64, fontPx: 92, stroke: 1.5, startR: 3,   defaultGap: 5, rowGap: 'gap-2' },
  'print-double':  { rowH: 84,  glyphH: 56, fontPx: 92, stroke: 1.5, startR: 3.5, defaultGap: 4, rowGap: 'gap-1.5' },
  'print-single':  { rowH: 150, glyphH: 96, fontPx: 92, stroke: 1.5, startR: 3.5, defaultGap: 5, rowGap: 'gap-2' },
};

const FONT_FAMILY = '"Playwrite GB J", "Schoolbell", "Short Stack", "Playpen Sans", cursive';
const VB_H = 120; // glyph viewBox height

// Cached canvas context for measuring glyph advances.
let measureCtx: CanvasRenderingContext2D | null = null;
function glyphAdvance(ch: string, fontPx: number): number {
  if (typeof document === 'undefined') return fontPx * 0.6;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return fontPx * 0.6;
  measureCtx.font = `italic 400 ${fontPx}px ${FONT_FAMILY}`;
  const w = measureCtx.measureText(ch).width;
  return w > 0 ? w : fontPx * 0.3;
}

interface TracingSheetProps {
  text?: string;
  hideStartDots?: boolean;
  letterSpacing?: number; // px between letters; falls back to the variant default
  cursive?: boolean;      // hollow letters with a dotted inner guide (editor "hollow" mode)
  variant: TracingVariant;
  fallbackText?: string;  // shown when text is empty
}

export default function TracingSheet({
  text,
  hideStartDots = false,
  letterSpacing,
  cursive = false,
  variant,
  fallbackText = 'KID',
}: TracingSheetProps) {
  const cfg = VARIANTS[variant];
  const gap = typeof letterSpacing === 'number' ? letterSpacing : cfg.defaultGap;

  // Re-measure once the handwriting fonts have loaded (first paint may use a
  // fallback font with different metrics).
  const [, setFontsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) setFontsReady(true);
      }).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const source = text && text.length > 0 ? text : fallbackText;
  const lines = source.split('\n');

  const scale = cfg.glyphH / VB_H;
  const pad = cfg.fontPx * 0.16; // viewBox units of horizontal breathing room per side

  const yTop = Math.round(cfg.rowH * 0.16);
  const yMid = Math.round(cfg.rowH * 0.5);
  const yBase = Math.round(cfg.rowH * 0.82);

  return (
    <div className={`w-full flex flex-col ${cfg.rowGap}`}>
      {lines.map((line, li) => (
        <div key={li} className="relative w-full" style={{ height: cfg.rowH }}>
          {/* Ruled guide lines for this row */}
          <svg
            className="absolute inset-0 w-full pointer-events-none"
            style={{ height: cfg.rowH }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="0%" y1={yTop} x2="100%" y2={yTop} stroke="#93c5fd" strokeWidth="1.2" />
            <line x1="0%" y1={yMid} x2="100%" y2={yMid} stroke="#fca5a5" strokeWidth="1.2" strokeDasharray="5 3" />
            <line x1="0%" y1={yBase} x2="100%" y2={yBase} stroke="#93c5fd" strokeWidth="1.2" />
          </svg>

          {/* Tracing glyphs, each sized to its measured advance width */}
          <div className="absolute inset-0 flex items-center justify-center px-2">
            <div className="flex items-baseline justify-center" style={{ columnGap: `${gap}px` }}>
              {line.split('').map((char, ci) => {
                if (char === ' ') {
                  const spaceW = glyphAdvance(' ', cfg.fontPx) * scale;
                  return <span key={ci} className="inline-block" style={{ width: `${spaceW}px` }} />;
                }
                const adv = glyphAdvance(char, cfg.fontPx);
                const vbW = adv + pad * 2;
                const cx = vbW / 2;
                return (
                  <svg
                    key={ci}
                    viewBox={`0 0 ${vbW} ${VB_H}`}
                    width={vbW * scale}
                    height={cfg.glyphH}
                    className="overflow-visible pointer-events-none flex-shrink-0"
                  >
                    <text
                      x={cx}
                      y="94"
                      textAnchor="middle"
                      fontSize={cfg.fontPx}
                      className={`school-tracing-font font-handwriting ${cursive ? 'fill-stone-50 stroke-stone-300' : 'fill-none stroke-stone-300'}`}
                      style={{
                        fontFamily: FONT_FAMILY,
                        fontStyle: 'italic',
                        fontWeight: 400,
                        strokeWidth: cfg.stroke,
                        strokeDasharray: cursive ? 'none' : '6,3',
                      }}
                    >
                      {char}
                    </text>

                    {/* Dotted inner guide for hollow (cursive) letters */}
                    {cursive && (
                      <text
                        x={cx}
                        y="94"
                        textAnchor="middle"
                        fontSize={cfg.fontPx}
                        className="school-tracing-font font-handwriting fill-none stroke-amber-400/60"
                        style={{
                          fontFamily: FONT_FAMILY,
                          fontStyle: 'italic',
                          fontWeight: 300,
                          strokeWidth: 1,
                          strokeDasharray: '2,2',
                        }}
                      >
                        {char}
                      </text>
                    )}

                    {!hideStartDots && <circle cx={cx} cy="16" r={cfg.startR} fill="#f43f5e" opacity="0.85" />}
                  </svg>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
