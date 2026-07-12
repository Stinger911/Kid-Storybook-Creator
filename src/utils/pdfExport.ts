/**
 * Client-side PDF export for StoryCraft books (premium feature).
 *
 * The print layout (`hidden print:block`) is `display:none` on screen, so we
 * temporarily render it off-screen at a fixed A4-ish pixel width, rasterise each
 * page with html2canvas-pro (a fork that understands Tailwind v4's oklch colors),
 * and place one captured page per A4 page in a jsPDF document.
 *
 * Libraries are loaded with dynamic import() so they stay out of the main bundle
 * and only download when a premium user actually exports.
 */

const A4 = { w: 210, h: 297 }; // mm
const RENDER_WIDTH_PX = 794; // ~A4 width at 96dpi

function sanitizeFileName(base: string): string {
  const cleaned = (base || 'storycraft').trim().replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');
  return (cleaned || 'storycraft').slice(0, 60);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Google Fonts stylesheet for the handwriting tracing font used by the SVG glyphs.
const TRACING_FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Playwrite+GB+J:ital,wght@1,100..400&display=swap';

let cachedFontFace: string | null | undefined;

/**
 * Builds an `@font-face` rule with the tracing font embedded as a base64 data URL.
 *
 * html2canvas rasterises inline <svg> by serialising it to an image, and external
 * web fonts referenced inside that image are NOT loaded — so the SVG <text> tracing
 * glyphs fall back to a default font in the PDF. Embedding the font inside each SVG
 * (as a self-contained @font-face) makes it render with the real handwriting font.
 */
async function getTracingFontFace(): Promise<string | null> {
  if (cachedFontFace !== undefined) return cachedFontFace;
  try {
    const cssResp = await fetch(TRACING_FONT_CSS_URL);
    const css = await cssResp.text();
    const match = css.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!match) {
      cachedFontFace = null;
      return null;
    }
    const dataUrl = await blobToDataUrl(await (await fetch(match[1])).blob());
    cachedFontFace =
      `@font-face{font-family:"Playwrite GB J";font-style:italic;font-weight:100 400;` +
      `src:url(${dataUrl}) format("woff2");}`;
    return cachedFontFace;
  } catch {
    cachedFontFace = null;
    return null;
  }
}

/**
 * Embeds the tracing @font-face into every text-bearing SVG under `root` so the
 * font survives html2canvas's SVG-to-image rasterisation. Returns a cleanup fn.
 */
function embedSvgFont(root: HTMLElement, fontFaceCss: string): () => void {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const added: Element[] = [];
  root.querySelectorAll('svg').forEach((svg) => {
    if (!svg.querySelector('text')) return; // only tracing glyph SVGs have <text>
    const styleEl = document.createElementNS(SVG_NS, 'style');
    styleEl.textContent = fontFaceCss;
    svg.insertBefore(styleEl, svg.firstChild);
    added.push(styleEl);
  });
  return () => added.forEach((el) => el.remove());
}

/**
 * Cross-origin coloring images (Firebase Storage) taint the html2canvas render,
 * producing blank pictures. Swap each remote <img> for a same-origin data URL
 * (fetched via our /api/proxy-image endpoint) before capture, and return a
 * function that restores the originals afterwards.
 */
async function inlineRemoteImages(root: HTMLElement): Promise<() => void> {
  const restores: Array<() => void> = [];
  const imgs = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return; // already inline / same-origin
      try {
        const resp = await fetch(`/api/proxy-image?url=${encodeURIComponent(src)}`);
        if (!resp.ok) return; // leave original src; that page image may be blank
        const dataUrl = await blobToDataUrl(await resp.blob());
        const original = img.getAttribute('src');
        img.setAttribute('src', dataUrl);
        restores.push(() => {
          if (original !== null) img.setAttribute('src', original);
        });
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* ignore decode hiccups */
          }
        }
      } catch {
        /* network error — keep the original src */
      }
    })
  );

  return () => restores.forEach((restore) => restore());
}

/**
 * Renders every `[data-pdf-page]` element inside `printRoot` into a downloadable
 * multi-page A4 PDF named after the book title.
 */
export async function exportBookToPdf(printRoot: HTMLElement, fileNameBase: string): Promise<void> {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ]);
  const html2canvas = html2canvasMod.default;

  // Make sure custom handwriting/serif fonts are ready before rasterising.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* non-fatal: continue with whatever fonts are available */
    }
  }

  const previousStyle = printRoot.getAttribute('style') || '';
  printRoot.style.cssText =
    `${previousStyle};display:block;position:fixed;left:-10000px;top:0;` +
    `width:${RENDER_WIDTH_PX}px;background:#ffffff;z-index:-1;`;

  // Make cross-origin coloring images same-origin so they don't render blank.
  const restoreImages = await inlineRemoteImages(printRoot);

  // Embed the handwriting font into the tracing SVGs so they don't fall back to a
  // default font when html2canvas rasterises them.
  const fontFaceCss = await getTracingFontFace();
  const restoreFont = fontFaceCss ? embedSvgFont(printRoot, fontFaceCss) : () => undefined;

  try {
    const pages = Array.from(printRoot.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    const targets = pages.length > 0 ? pages : [printRoot];

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < targets.length; i++) {
      const canvas = await html2canvas(targets[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // Fit the captured page inside A4 while preserving aspect ratio, centered.
      let drawW = A4.w;
      let drawH = (canvas.height * drawW) / canvas.width;
      let offsetX = 0;
      let offsetY = (A4.h - drawH) / 2;

      if (drawH > A4.h) {
        drawH = A4.h;
        drawW = (canvas.width * drawH) / canvas.height;
        offsetX = (A4.w - drawW) / 2;
        offsetY = 0;
      }

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);
    }

    pdf.save(`${sanitizeFileName(fileNameBase)}.pdf`);
  } finally {
    restoreFont();
    restoreImages();
    // Restore the print layout to its hidden on-screen state.
    if (previousStyle) {
      printRoot.setAttribute('style', previousStyle);
    } else {
      printRoot.removeAttribute('style');
    }
  }
}
